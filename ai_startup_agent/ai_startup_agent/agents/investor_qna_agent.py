"""agents/investor_qna_agent.py — Investor Grilling Simulator (NEW, unique hook)

This is what differentiates this project from a generic "6 agents produce
a report" demo. It uses the FULL context already gathered by every other
agent to generate the specific, sharp questions a real VC would ask about
THIS idea's actual weak points -- then coaches the founder's live answers.
"""

from utils.llm import LLMClient

QUESTIONS_SYSTEM_PROMPT = """You are a skeptical, sharp venture capital
partner about to grill a founder in a pitch meeting. You have read the
full analysis of their startup (market, competitors, technical feasibility,
business model, financials, validation verdict) below. Generate the 5 most
incisive, uncomfortable questions you would actually ask THIS founder about
THIS specific idea -- reference their actual numbers and weak points, not
generic startup questions. Order them from toughest to easiest.

Respond ONLY with a JSON object matching this schema:
{
  "questions": [
    {"question": "string", "why_it_matters": "1 sentence on what a weak answer reveals"}
  ]
}"""

FEEDBACK_SYSTEM_PROMPT = """You are the same skeptical VC partner. The founder
just answered one of your questions. Give short, honest, constructive feedback
on their answer -- as a real investor would, not a cheerleader. Point out gaps,
and if the answer was genuinely strong, say so briefly.

Respond ONLY with a JSON object matching this schema:
{
  "strength_rating": number,   // 1-10
  "feedback": "2-4 sentences of direct, specific feedback",
  "follow_up_question": "a natural, sharper follow-up question, or null if none needed"
}"""


class InvestorQnAAgent:
    name = "Investor Grilling Simulator"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    def generate_questions(self, idea_text: str, full_context: dict) -> dict:
        user_prompt = f"""Startup idea:
\"\"\"{idea_text}\"\"\"

Full analysis so far:
{full_context}

Generate the 5 toughest, most specific investor questions now."""
        return self.llm.chat_json(QUESTIONS_SYSTEM_PROMPT, user_prompt, temperature=0.6)

    def score_answer(self, question: str, founder_answer: str, idea_text: str) -> dict:
        user_prompt = f"""Startup idea: \"\"\"{idea_text}\"\"\"

Your question: "{question}"

Founder's answer: "{founder_answer}"

Give your feedback now."""
        return self.llm.chat_json(FEEDBACK_SYSTEM_PROMPT, user_prompt, temperature=0.5)
