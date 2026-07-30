"""agents/business_model_agent.py — Business Model & GTM Strategy Agent"""

from utils.llm import LLMClient

SYSTEM_PROMPT = """You are a startup strategy consultant specializing in
business model design and go-to-market planning.

Respond ONLY with a JSON object matching this exact schema:
{
  "business_model": "string, e.g. 'B2B SaaS subscription'",
  "revenue_streams": [
    {"name": "string", "description": "1 sentence", "pricing_hint": "string"}
  ],
  "pricing_strategy": "2-3 sentences",
  "gtm_strategy": {
    "phase_1_launch": "1-2 sentences",
    "phase_2_growth": "1-2 sentences",
    "primary_channels": ["3-5 short items"]
  },
  "key_metrics_to_track": ["3-5 short items, e.g. CAC, LTV, churn"]
}"""


class BusinessModelAgent:
    name = "Business Model Agent"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    def run(self, idea_text: str, market_data: dict, competitor_data: dict) -> dict:
        user_prompt = f"""Startup idea:
\"\"\"{idea_text}\"\"\"

Market context: {market_data.get('market_summary')}
Target audience: {market_data.get('target_audience')}
Competitive gap: {competitor_data.get('market_gap')}

Produce the business model JSON now."""
        return self.llm.chat_json(SYSTEM_PROMPT, user_prompt, temperature=0.4)
