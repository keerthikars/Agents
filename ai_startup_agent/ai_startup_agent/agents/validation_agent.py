"""agents/validation_agent.py — Startup Validation Agent

Synthesizes market, competitor, and technical feasibility data into a
single 0-10 overall viability score plus a factor breakdown, used for
the gauge chart in the UI.
"""

from utils.llm import LLMClient

SYSTEM_PROMPT = """You are a startup accelerator's investment committee chair.
You review the analysis already done by other specialists and produce a final,
brutally honest viability verdict. Don't inflate scores to be nice.

Respond ONLY with a JSON object matching this exact schema:
{
  "overall_score": number,          // 1-10, one decimal place
  "factor_scores": {
    "market_opportunity": number,   // 1-10
    "competitive_position": number, // 1-10
    "technical_feasibility": number,// 1-10
    "business_viability": number    // 1-10
  },
  "verdict": "strong go" | "conditional go" | "needs major pivot" | "not recommended",
  "top_strengths": ["2-3 short items"],
  "top_risks": ["2-3 short items"],
  "recommendation": "3-4 sentence final recommendation to the founder"
}"""


class ValidationAgent:
    name = "Startup Validation Agent"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    def run(self, idea_text: str, market_data: dict, competitor_data: dict,
             technical_data: dict) -> dict:
        user_prompt = f"""Startup idea:
\"\"\"{idea_text}\"\"\"

Market analysis: {market_data}

Competitor analysis: {competitor_data}

Technical feasibility: {technical_data}

Produce the final validation JSON now."""
        return self.llm.chat_json(SYSTEM_PROMPT, user_prompt, temperature=0.35)
