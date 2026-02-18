import json
import requests
from bs4 import BeautifulSoup

from ..config import settings


def _format_time(minutes) -> str:
    if not minutes:
        return None
    try:
        mins = int(minutes)
    except (TypeError, ValueError):
        return str(minutes)
    if mins < 60:
        return f"{mins} min"
    h, m = divmod(mins, 60)
    return f"{h}h {m}min" if m else f"{h}h"


def _quality_ok(scraper) -> bool:
    try:
        title = scraper.title() or ""
        ingredients = scraper.ingredients() or []
        return bool(title.strip()) and len(ingredients) >= 2
    except Exception:
        return False


def _instructions_list(scraper) -> list:
    try:
        raw = scraper.instructions()
        if not raw:
            return []
        if isinstance(raw, list):
            return [s.strip() for s in raw if s.strip()]
        # recipe-scrapers returns \n-delimited string, NOT a list
        return [s.strip() for s in raw.split("\n") if s.strip()]
    except Exception:
        return []


_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def _browser_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(_BROWSER_HEADERS)
    return s


def _extract_url_from_html(html: str) -> str:
    """Pull the canonical URL out of the page's own meta tags."""
    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find("link", rel="canonical")
    if tag and tag.get("href"):
        return tag["href"]
    tag = soup.find("meta", property="og:url")
    if tag and tag.get("content"):
        return tag["content"]
    return ""


def parse_recipe_html(html: str, url: str = "") -> dict:
    """Parse a recipe from raw HTML (user-supplied via paste or file upload).

    If no URL is provided, the canonical URL is extracted from the HTML so
    recipe-scrapers can select the right site-specific parser. Falls back to
    wild_mode (Schema.org) for unrecognized sites.
    """
    org_url = url or _extract_url_from_html(html) or "https://unknown.example.com"

    from recipe_scrapers import scrape_html
    try:
        scraper = scrape_html(html, org_url=org_url, wild_mode=True)
    except Exception as e:
        raise ValueError(f"Could not parse recipe from HTML: {e}")

    if not _quality_ok(scraper):
        raise ValueError("No recognizable recipe found in the HTML. Make sure you copied the full page source.")

    try:
        image = scraper.image()
    except Exception:
        image = None
    try:
        total_time_raw = scraper.total_time()
    except Exception:
        total_time_raw = None
    try:
        yields = str(scraper.yields()) if scraper.yields() else None
    except Exception:
        yields = None

    return {
        "title": scraper.title().strip(),
        "url": url or (org_url if org_url != "https://unknown.example.com" else None),
        "image_url": image,
        "total_time": _format_time(total_time_raw),
        "yields": yields,
        "ingredients": scraper.ingredients() or [],
        "instructions": _instructions_list(scraper),
        "source": "url",
    }


def scrape_recipe_url(url: str) -> dict:
    """Try recipe-scrapers first; fall back to Claude Haiku if needed.

    Fetches HTML once with browser-like headers (the library itself does not
    bypass bot protection), then passes the raw HTML to scrape_html() per
    the documented pattern.
    """
    session = _browser_session()

    # Fetch once — reuse HTML for both scraper and Claude fallback
    try:
        resp = session.get(url, timeout=15)
    except Exception as e:
        raise ValueError(f"Could not reach that URL: {e}")

    if resp.status_code == 403:
        from urllib.parse import urlparse
        host = urlparse(url).hostname or url
        raise ValueError(
            f"{host} blocks automated access (bot protection). "
            "Try a different recipe site, or use AI Suggestions to generate a recipe."
        )
    resp.raise_for_status()

    html = resp.text

    # 1. Try recipe-scrapers with our pre-fetched HTML
    try:
        from recipe_scrapers import scrape_html
        scraper = scrape_html(html, org_url=url)
        if _quality_ok(scraper):
            try:
                image = scraper.image()
            except Exception:
                image = None
            try:
                total_time_raw = scraper.total_time()
            except Exception:
                total_time_raw = None
            try:
                yields = str(scraper.yields()) if scraper.yields() else None
            except Exception:
                yields = None

            return {
                "title": scraper.title().strip(),
                "url": url,
                "image_url": image,
                "total_time": _format_time(total_time_raw),
                "yields": yields,
                "ingredients": scraper.ingredients() or [],
                "instructions": _instructions_list(scraper),
                "source": "url",
            }
    except Exception:
        pass

    # 2. Claude fallback — reuse the already-fetched HTML
    if not settings.anthropic_api_key:
        raise ValueError(
            "Could not parse recipe from this URL. "
            "Add ANTHROPIC_API_KEY to enable AI fallback."
        )

    return _claude_scrape(url, html)


def _claude_scrape(url: str, html: str) -> dict:
    import anthropic

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    text = text[:8000]

    prompt = f"""Extract the recipe from this webpage content. Return ONLY valid JSON, no markdown.

URL: {url}

Content:
{text}

Return this exact JSON structure:
{{
  "title": "Recipe Name",
  "total_time": "45 min",
  "yields": "4 servings",
  "ingredients": ["1 cup flour", "2 eggs"],
  "instructions": ["Preheat oven to 350F.", "Mix ingredients."]
}}

If you cannot find a recipe, return: {{"error": "No recipe found"}}"""

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text.strip()
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        response_text = "\n".join(lines).strip()

    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(response_text[start:end])
        else:
            raise ValueError("Could not parse recipe from AI response")

    if "error" in data:
        raise ValueError(data["error"])

    return {
        "title": data.get("title", "Untitled Recipe"),
        "url": url,
        "image_url": None,
        "total_time": data.get("total_time"),
        "yields": data.get("yields"),
        "ingredients": data.get("ingredients", []),
        "instructions": data.get("instructions", []),
        "source": "url",
    }
