import json
import anthropic

from ..config import settings


CATEGORIES = ["dairy", "produce", "meat", "frozen", "dry goods", "snacks", "beverages", "condiments", "leftovers", "other"]


def parse_item_list(text: str) -> list:
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY is not configured.")

    prompt = f"""Parse the following household inventory list into a JSON array.

Available categories: {", ".join(CATEGORIES)}

Rules:
- name: capitalize properly (e.g. "Whole Milk", "Greek Yogurt")
- quantity: number, default 1 if not specified
- unit: common unit string (e.g. "gallons", "oz", "lbs", "cans", "boxes", "bags", "jars", "bottles", "dozen") — empty string if none makes sense
- category: pick the best match from the available categories

Examples:
"2 gallons milk" → {{"name": "Whole Milk", "quantity": 2, "unit": "gallons", "category": "dairy"}}
"eggs" → {{"name": "Eggs", "quantity": 1, "unit": "dozen", "category": "dairy"}}
"3 cans tomatoes" → {{"name": "Canned Tomatoes", "quantity": 3, "unit": "cans", "category": "produce"}}
"pasta" → {{"name": "Pasta", "quantity": 1, "unit": "box", "category": "dry goods"}}
"olive oil 16oz" → {{"name": "Olive Oil", "quantity": 16, "unit": "oz", "category": "condiments"}}

Return ONLY a valid JSON array with no markdown, no explanation.

List to parse:
{text}"""

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text.strip()

    # Strip markdown fences if present
    if response_text.startswith("```"):
        lines = [l for l in response_text.split("\n") if not l.strip().startswith("```")]
        response_text = "\n".join(lines).strip()

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        start = response_text.find("[")
        end = response_text.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(response_text[start:end])
        raise ValueError("Could not parse AI response as JSON")
