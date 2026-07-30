"""agents/technical_feasibility_agent.py — Technical Feasibility Agent (NEW)

Assesses whether the idea is technically buildable, what stack an MVP
would need, how long it would realistically take, and the biggest
engineering risks. This is what separates "great idea" from "buildable
product" in the final scoring.
"""

from utils.llm import LLMClient

SYSTEM_PROMPT = """You are a pragmatic CTO who has shipped multiple MVPs.
Given a startup idea, assess its technical feasibility honestly -- don't
be a cheerleader. Flag real engineering risk (e.g. regulatory-grade AI
accuracy, hardware dependency, data availability, integration complexity).

Respond ONLY with a JSON object matching this exact schema:
{
  "feasibility_score": number,        // 1-10, 10 = trivial to build
  "recommended_stack": ["4-7 short technology items"],
  "mvp_timeline_weeks": number,
  "team_size_needed": number,
  "key_technical_risks": ["2-4 short risk statements"],
  "build_vs_buy_notes": "1-2 sentences on what to build vs use off-the-shelf",
  "feasibility_summary": "2-3 sentence honest verdict"
}"""


class TechnicalFeasibilityAgent:
    name = "Technical Feasibility Agent"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    def run(self, idea_text: str) -> dict:
        user_prompt = f"""Startup idea:
\"\"\"{idea_text}\"\"\"

Produce the technical feasibility JSON now."""
        return self.llm.chat_json(SYSTEM_PROMPT, user_prompt, temperature=0.3)
