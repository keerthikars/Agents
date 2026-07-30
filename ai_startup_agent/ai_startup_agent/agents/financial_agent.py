"""agents/financial_agent.py — Financial Projections Agent"""

from utils.llm import LLMClient

SYSTEM_PROMPT = """You are a startup CFO building an investor-ready 3-year
financial projection. Ground numbers in the market size and business model
given -- don't produce implausible hockey sticks disconnected from the TAM.

Respond ONLY with a JSON object matching this exact schema:
{
  "yearly_projections": [
    {"year": 1, "revenue_usd": number, "customers": number, "burn_rate_usd_monthly": number},
    {"year": 2, "revenue_usd": number, "customers": number, "burn_rate_usd_monthly": number},
    {"year": 3, "revenue_usd": number, "customers": number, "burn_rate_usd_monthly": number}
  ],
  "initial_funding_needed_usd": number,
  "breakeven_month": number,
  "key_assumptions": ["3-4 short assumptions behind these numbers"]
}"""


class FinancialAgent:
    name = "Financial Projections Agent"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    def run(self, idea_text: str, market_data: dict, business_model_data: dict) -> dict:
        user_prompt = f"""Startup idea:
\"\"\"{idea_text}\"\"\"

TAM: ${market_data.get('tam_usd_billion')}B, SAM: ${market_data.get('sam_usd_billion')}B
Business model: {business_model_data.get('business_model')}
Pricing strategy: {business_model_data.get('pricing_strategy')}

Produce the financial projections JSON now."""
        return self.llm.chat_json(SYSTEM_PROMPT, user_prompt, temperature=0.3)
