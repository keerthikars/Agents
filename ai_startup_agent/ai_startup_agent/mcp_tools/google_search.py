"""
mcp_tools/google_search.py
Lightweight web search tool the Market and Competitor agents can call for
grounding. Uses the Serper.dev Google Search API if SERPER_API_KEY is set
(free tier available). If no key is configured, agents simply skip live
search and rely on the LLM's own knowledge -- the app still works end to
end without this key, it's an optional enhancement.
"""

import os
import requests

SERPER_URL = "https://google.serper.dev/search"


def is_configured() -> bool:
    return bool(os.getenv("SERPER_API_KEY"))


def search(query: str, num_results: int = 5) -> list[dict]:
    """Return a list of {title, snippet, link} dicts, or [] if unconfigured
    or the request fails."""
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        return []

    try:
        resp = requests.post(
            SERPER_URL,
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": query, "num": num_results},
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return []

    results = []
    for item in data.get("organic", [])[:num_results]:
        results.append(
            {
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "link": item.get("link", ""),
            }
        )
    return results


def format_results_for_prompt(results: list[dict]) -> str:
    if not results:
        return "(No live search results available -- rely on general knowledge.)"
    lines = []
    for r in results:
        lines.append(f"- {r['title']}: {r['snippet']} ({r['link']})")
    return "\n".join(lines)
