# 🚀 AI Startup Co-Founder

An 8-agent AI pipeline that validates a startup idea the way a real due-diligence
team would — from a typed idea **or an uploaded PDF pitch deck** — then lets you
rehearse your pitch against an AI investor before you face a real one.

---

## ✨ What makes this different

Most "multi-agent idea validator" demos stop at generating a report. This one adds
an **Investor Grilling Simulator**: after all analysis is done, an AI VC agent reads
the *entire* context (your specific market numbers, your specific competitors, your
specific technical risks) and generates the 5 sharpest, most uncomfortable questions
it would actually ask you — then scores and coaches your live answers, question by
question. It's a rehearsal tool, not just a report generator.

---

## 🧠 The 8 Agents

| # | Agent | What it does |
|---|-------|---------------|
| 1 | **Market Research Agent** | TAM/SAM/SOM, CAGR, trends, target audience |
| 2 | **Competitor Analysis Agent** | Direct/indirect competitors, positioning, market gap |
| 3 | **Technical Feasibility Agent** *(new)* | Buildability, MVP timeline, stack, engineering risk |
| 4 | **Business Model Agent** | Revenue streams, pricing, GTM strategy |
| 5 | **Financial Projections Agent** | 3-year revenue/customer/burn projections |
| 6 | **Startup Validation Agent** | Synthesizes everything into a 0–10 viability verdict |
| 7 | **Investor Grilling Simulator** *(new)* | Generates & scores answers to VC-style tough questions |
| 8 | **Pitch Deck Agent** | Auto-generates a downloadable `.pptx` investor deck |

All 8 agents are orchestrated by a `CoordinatorAgent` that feeds each agent's
output forward to the next, so later agents reason over real context instead of
guessing in isolation. Shared context is persisted via a session memory layer
(MongoDB if configured, otherwise a safe in-memory fallback).

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| LLM | Groq `llama-3.3-70b-versatile` |
| UI | Streamlit (custom dark theme) |
| Memory | MongoDB (optional, falls back to in-memory) |
| Web grounding | Serper.dev Google Search API (optional) |
| PDF input | pypdf |
| Slides | python-pptx |
| Charts | Plotly |

---

## 📁 Project Structure

```
ai_startup_agent/
├── agents/
│   ├── coordinator_agent.py         # Orchestrates all 8 agents
│   ├── market_agent.py
│   ├── competitor_agent.py
│   ├── technical_feasibility_agent.py   # NEW
│   ├── business_model_agent.py
│   ├── financial_agent.py
│   ├── validation_agent.py
│   ├── investor_qna_agent.py        # NEW — the unique hook
│   └── pitch_deck_agent.py
├── utils/
│   ├── llm.py                       # Groq client wrapper
│   ├── memory.py                    # Shared memory (Mongo + fallback)
│   └── pdf_parser.py                # PDF -> text extraction
├── mcp_tools/
│   └── google_search.py             # Optional live search grounding
├── static/
│   └── style.css                    # Premium dark UI theme
├── .streamlit/config.toml           # Streamlit theme config
├── app.py                           # Streamlit frontend
├── requirements.txt
└── .env.example
```

---

## ⚙️ Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/keerthisreem/ai_startup_agent.git
cd ai_startup_agent
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

```
GROQ_API_KEY=your_groq_api_key_here      # required, free at console.groq.com
MONGO_URI=                                # optional
SERPER_API_KEY=                           # optional, free at serper.dev
```

### 4. Run the app

```bash
streamlit run app.py
```

Open <http://localhost:8501> in your browser.

---

## 🚀 How It Works

1. Enter your startup idea as text, **or upload a pitch deck / business plan PDF**
2. Click **Analyze My Startup Idea** — watch the progress bar as all 8 agents run
3. Explore results across tabs: Overview, Market, Competitors, Technical, Business
   Model, Financials
4. Head to **Investor Grilling** — answer the AI VC's toughest questions and get
   real-time coaching feedback
5. Download your pitch deck (`.pptx`), full report (`.md`), or raw analysis (`.json`)

---

## 👥 Team

| Name | Roll No |
|---|---|
| Keerthisree M | 24EC074 |
| Keerthika R | 24EC073 |
| Nagalakshmi A | 24EC100 |

---

## 📄 License

This project is for educational purposes.
