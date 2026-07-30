"""agents/competitor_agent.py — Competitor Analysis Agent"""

from utils.llm import LLMClient
from mcp_tools import google_search

SYSTEM_PROMPT = """You are a competitive intelligence analyst. Given a startup idea
and its market context, identify realistic competitors (real companies where you
are confident they exist, otherwise clearly labeled "emerging/indirect competitor
archetype") and map the competitive landscape.

Respond ONLY with a JSON object matching this exact schema:
{
  "competitors": [
    {
      "name": "string",
      "type": "direct" | "indirect",
      "strengths": ["1-3 short items"],
      "weaknesses": ["1-3 short items"],
      "positioning_score": number  // 1-10, how strong their market position is
    }
  ],
  "market_gap": "2-3 sentences on the whitespace this startup could own",
  "differentiation_recommendation": "2-3 sentences on how to differentiate",
  "competitive_intensity": "low" | "medium" | "high"
}
Include 3-5 competitors."""


class CompetitorAgent:
    name = "Competitor Analysis Agent"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    def run(self, idea_text: str, market_data: dict) -> dict:
        search_results = []
        if google_search.is_configured():
            industry = market_data.get("industry", idea_text[:60])
            search_results = google_search.search(f"top competitors {industry} startups")
        search_context = google_search.format_results_for_prompt(search_results)

        user_prompt = f"""Startup idea:
\"\"\"{idea_text}\"\"\"

Market context:
Industry: {market_data.get('industry')}
Target audience: {market_data.get('target_audience')}

Relevant web search context (may be empty):
{search_context}

Produce the competitor analysis JSON now."""

        return self.llm.chat_json(SYSTEM_PROMPT, user_prompt, temperature=0.4)
