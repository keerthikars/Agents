"""agents/market_agent.py — Market Research Agent"""

from utils.llm import LLMClient
from mcp_tools import google_search

SYSTEM_PROMPT = """You are a senior market research analyst at a top-tier VC firm.
Given a startup idea, produce a rigorous, realistic market analysis. Be specific
with numbers where possible (cite plausible industry figures, don't invent exact
sources). Avoid generic filler like "the market is growing rapidly" without a number.

Respond ONLY with a JSON object matching this exact schema:
{
  "industry": "string, the industry category",
  "tam_usd_billion": number,
  "sam_usd_billion": number,
  "som_usd_billion": number,
  "cagr_percent": number,
  "key_trends": ["3-5 short trend statements"],
  "target_audience": {
    "primary_segment": "string",
    "demographics": "string",
    "pain_points": ["2-4 short pain points"]
  },
  "market_summary": "2-3 sentence narrative summary"
}"""


class MarketAgent:
    name = "Market Research Agent"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    def run(self, idea_text: str) -> dict:
        search_results = []
        if google_search.is_configured():
            search_results = google_search.search(f"{idea_text[:100]} market size trends")
        search_context = google_search.format_results_for_prompt(search_results)

        user_prompt = f"""Startup idea:
\"\"\"{idea_text}\"\"\"

Relevant web search context (may be empty):
{search_context}

Produce the market analysis JSON now."""

        return self.llm.chat_json(SYSTEM_PROMPT, user_prompt, temperature=0.3)
