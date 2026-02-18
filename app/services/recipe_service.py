import json
import anthropic
from typing import List

from ..config import settings
from ..models import Item


def get_recipe_suggestions(items: List[Item], dietary_notes: str = "") -> list:
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY is not configured. Add it to your .env file.")

    inventory_lines = []
    for item in items:
        if item.unit:
            qty_str = f"{item.quantity} {item.unit}"
        else:
            qty_str = str(item.quantity)
        cat = item.category.name if item.category else "misc"
        inventory_lines.append(f"- {item.name} ({cat}): {qty_str}")

    inventory_text = "\n".join(inventory_lines)
    dietary_part = f"\nDietary notes/restrictions: {dietary_notes}" if dietary_notes else ""

    prompt = f"""Given the following kitchen inventory, suggest 3-5 recipes I can make.

Inventory:
{inventory_text}{dietary_part}

Respond with ONLY a valid JSON array of recipe objects. No markdown, no explanation, just the JSON.
Each recipe must have:
- name (string)
- description (string, 1-2 sentences)
- ingredients (array of strings with amounts)
- instructions (array of strings, step-by-step)
- uses_items (array of item names from the inventory used in this recipe)

Example format:
[
  {{
    "name": "Pasta Primavera",
    "description": "A light pasta dish with fresh vegetables.",
    "ingredients": ["200g pasta", "2 cloves garlic", "1 zucchini"],
    "instructions": ["Boil pasta.", "Saute garlic.", "Combine and serve."],
    "uses_items": ["pasta", "garlic", "zucchini"]
  }}
]"""

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text.strip()

    # Strip markdown code fences if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        # Remove first and last fence lines
        lines = [l for l in lines if not l.strip().startswith("```")]
        response_text = "\n".join(lines).strip()

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract JSON array from anywhere in the response
        start = response_text.find("[")
        end = response_text.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(response_text[start:end])
        raise ValueError("Could not parse recipe suggestions from AI response")
