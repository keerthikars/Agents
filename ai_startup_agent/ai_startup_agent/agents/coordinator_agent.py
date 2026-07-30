"""agents/coordinator_agent.py — Orchestrates the full 8-agent pipeline.

Pipeline order matters: each agent's output feeds the next, so later
agents (financial, validation, investor Q&A) reason over real upstream
context instead of guessing in isolation.
"""

from typing import Callable, Optional

from agents.market_agent import MarketAgent
from agents.competitor_agent import CompetitorAgent
from agents.technical_feasibility_agent import TechnicalFeasibilityAgent
from agents.validation_agent import ValidationAgent
from agents.business_model_agent import BusinessModelAgent
from agents.financial_agent import FinancialAgent
from agents.investor_qna_agent import InvestorQnAAgent
from agents.pitch_deck_agent import PitchDeckAgent

from utils.llm import LLMClient
from utils.memory import SessionMemory

# (step_key, display_label) — used to drive the UI progress bar
PIPELINE_STEPS = [
    ("market", "Market Research Agent"),
    ("competitor", "Competitor Analysis Agent"),
    ("technical", "Technical Feasibility Agent"),
    ("business_model", "Business Model Agent"),
    ("financial", "Financial Projections Agent"),
    ("validation", "Startup Validation Agent"),
    ("investor_questions", "Investor Grilling Simulator"),
    ("pitch_deck", "Pitch Deck Generator"),
]


class CoordinatorAgent:
    def __init__(self, llm: Optional[LLMClient] = None, memory: Optional[SessionMemory] = None):
        self.llm = llm or LLMClient()
        self.memory = memory or SessionMemory()

        self.market_agent = MarketAgent(self.llm)
        self.competitor_agent = CompetitorAgent(self.llm)
        self.technical_agent = TechnicalFeasibilityAgent(self.llm)
        self.business_model_agent = BusinessModelAgent(self.llm)
        self.financial_agent = FinancialAgent(self.llm)
        self.validation_agent = ValidationAgent(self.llm)
        self.investor_qna_agent = InvestorQnAAgent(self.llm)
        self.pitch_deck_agent = PitchDeckAgent()

    def run_pipeline(self, idea_text: str, idea_title: str = "Untitled Startup",
                      progress_callback: Optional[Callable[[str, str], None]] = None) -> dict:
        """Runs all 8 agents in sequence. progress_callback(step_key, label) is
        called before each step starts, so the UI can update a progress bar."""

        def notify(step_key, label):
            if progress_callback:
                progress_callback(step_key, label)

        results: dict = {"idea_title": idea_title, "idea_text": idea_text}

        notify("market", "Market Research Agent")
        results["market"] = self.market_agent.run(idea_text)
        self.memory.set("market", results["market"])

        notify("competitor", "Competitor Analysis Agent")
        results["competitor"] = self.competitor_agent.run(idea_text, results["market"])
        self.memory.set("competitor", results["competitor"])

        notify("technical", "Technical Feasibility Agent")
        results["technical"] = self.technical_agent.run(idea_text)
        self.memory.set("technical", results["technical"])

        notify("business_model", "Business Model Agent")
        results["business_model"] = self.business_model_agent.run(
            idea_text, results["market"], results["competitor"]
        )
        self.memory.set("business_model", results["business_model"])

        notify("financial", "Financial Projections Agent")
        results["financial"] = self.financial_agent.run(
            idea_text, results["market"], results["business_model"]
        )
        self.memory.set("financial", results["financial"])

        notify("validation", "Startup Validation Agent")
        results["validation"] = self.validation_agent.run(
            idea_text, results["market"], results["competitor"], results["technical"]
        )
        self.memory.set("validation", results["validation"])

        notify("investor_questions", "Investor Grilling Simulator")
        full_context = {k: v for k, v in results.items() if k not in ("idea_title", "idea_text")}
        results["investor_questions"] = self.investor_qna_agent.generate_questions(
            idea_text, full_context
        )
        self.memory.set("investor_questions", results["investor_questions"])

        notify("pitch_deck", "Pitch Deck Generator")
        results["pitch_deck_bytes"] = self.pitch_deck_agent.run(idea_title, results)

        return results
