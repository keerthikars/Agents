"""
app.py — AI Startup Co-Founder: 8-agent idea validation pipeline.

Enter an idea as text or upload a PDF (pitch deck / business plan), run
the full multi-agent analysis, explore results across tabs, get grilled
by the AI investor simulator, and download a pitch deck.
"""

import os
import io
import json
from datetime import datetime

import streamlit as st
import plotly.graph_objects as go
from dotenv import load_dotenv

from agents.coordinator_agent import CoordinatorAgent, PIPELINE_STEPS
from utils.pdf_parser import extract_text_from_pdf
from utils.memory import SessionMemory

load_dotenv()

st.set_page_config(
    page_title="AI Startup Co-Founder",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---- styling -----------------------------------------------------------

def load_css():
    css_path = os.path.join(os.path.dirname(__file__), "static", "style.css")
    if os.path.exists(css_path):
        with open(css_path, encoding="utf-8") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

load_css()

# ---- session state -------------------------------------------------------

if "results" not in st.session_state:
    st.session_state.results = None
if "qna_history" not in st.session_state:
    st.session_state.qna_history = {}  # question_index -> list of {role, text}
if "memory" not in st.session_state:
    st.session_state.memory = SessionMemory()

VERDICT_BADGE = {
    "strong go": "badge-strong",
    "conditional go": "badge-conditional",
    "needs major pivot": "badge-pivot",
    "not recommended": "badge-no",
}

# ---- sidebar --------------------------------------------------------------

with st.sidebar:
    st.markdown("### 🚀 AI Startup Co-Founder")
    st.caption("An 8-agent pipeline that validates your idea like a real due-diligence team.")
    st.markdown("---")
    st.markdown("**Pipeline (8 agents)**")
    for _, label in PIPELINE_STEPS:
        st.markdown(f"- {label}")
    st.markdown("---")
    memory_backend = st.session_state.memory.backend
    st.caption(f"Memory backend: `{memory_backend}`")
    if not os.getenv("GROQ_API_KEY"):
        st.warning("GROQ_API_KEY not set — add it to your .env file to run analysis.")
    if st.session_state.results and st.button("🔄 Start a new analysis"):
        st.session_state.results = None
        st.session_state.qna_history = {}
        st.rerun()

# ---- header -----------------------------------------------------------

st.markdown('<div class="hero-title">AI Startup Co-Founder</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="hero-subtitle">Enter your idea or upload a pitch deck PDF. '
    '8 specialized AI agents will research the market, size up competitors, '
    'stress-test feasibility, model your finances, score viability, and grill you like a VC.</div>',
    unsafe_allow_html=True,
)

# ============================================================================
# INPUT SCREEN
# ============================================================================

if st.session_state.results is None:
    input_mode = st.radio("How do you want to submit your idea?", ["✍️ Type it", "📄 Upload a PDF"], horizontal=True)

    idea_title = st.text_input("Startup name (optional)", placeholder="e.g. GreenCart")
    idea_text = ""

    if input_mode == "✍️ Type it":
        idea_text = st.text_area(
            "Describe your startup idea",
            height=180,
            placeholder="e.g. A subscription box that delivers locally-sourced, "
                        "zero-waste grocery staples to urban apartments, using route "
                        "optimization to keep delivery costs under $2/order...",
        )
    else:
        uploaded = st.file_uploader("Upload a pitch deck or business plan (PDF)", type=["pdf"])
        if uploaded is not None:
            try:
                idea_text = extract_text_from_pdf(uploaded.read())
                with st.expander("Preview extracted text"):
                    st.text(idea_text[:2000] + ("..." if len(idea_text) > 2000 else ""))
            except ValueError as e:
                st.error(str(e))

    run_clicked = st.button("Analyze My Startup Idea 🚀", type="primary", use_container_width=True)

    if run_clicked:
        if not idea_text or len(idea_text.strip()) < 20:
            st.error("Please provide a more complete idea description (at least a couple of sentences), or upload a readable PDF.")
        elif not os.getenv("GROQ_API_KEY"):
            st.error("GROQ_API_KEY is not configured. Add it to your .env file and restart the app.")
        else:
            coordinator = CoordinatorAgent(memory=st.session_state.memory)
            progress_bar = st.progress(0.0)
            status = st.empty()

            def on_progress(step_key, label):
                idx = [s[0] for s in PIPELINE_STEPS].index(step_key)
                progress_bar.progress(idx / len(PIPELINE_STEPS))
                status.info(f"Running: **{label}**...")

            try:
                results = coordinator.run_pipeline(
                    idea_text,
                    idea_title=idea_title or "Untitled Startup",
                    progress_callback=on_progress,
                )
                progress_bar.progress(1.0)
                status.success("Analysis complete!")
                st.session_state.results = results
                st.rerun()
            except Exception as e:  # noqa: BLE001
                st.error(f"Pipeline failed: {e}")

# ============================================================================
# RESULTS SCREENS
# ============================================================================

else:
    r = st.session_state.results
    market = r.get("market", {})
    competitor = r.get("competitor", {})
    technical = r.get("technical", {})
    business_model = r.get("business_model", {})
    financial = r.get("financial", {})
    validation = r.get("validation", {})
    investor_questions = r.get("investor_questions", {}).get("questions", [])

    st.markdown(f"## {r.get('idea_title')}")

    verdict = validation.get("verdict", "")
    badge_class = VERDICT_BADGE.get(verdict, "badge-conditional")
    st.markdown(
        f'<span class="badge {badge_class}">{verdict.upper() if verdict else "PENDING"}</span> '
        f'&nbsp; Overall Score: **{validation.get("overall_score", "—")}/10**',
        unsafe_allow_html=True,
    )

    tabs = st.tabs([
        "📊 Overview", "🌍 Market", "⚔️ Competitors", "🛠️ Technical",
        "💼 Business Model", "💰 Financials", "🎤 Investor Grilling", "📥 Export"
    ])

    # ---- Overview -------------------------------------------------------
    with tabs[0]:
        col1, col2, col3, col4 = st.columns(4)
        factor_scores = validation.get("factor_scores", {})
        cards = [
            ("Market Opportunity", factor_scores.get("market_opportunity", "—")),
            ("Competitive Position", factor_scores.get("competitive_position", "—")),
            ("Technical Feasibility", factor_scores.get("technical_feasibility", "—")),
            ("Business Viability", factor_scores.get("business_viability", "—")),
        ]
        for col, (label, val) in zip([col1, col2, col3, col4], cards):
            with col:
                st.markdown(
                    f'<div class="metric-card"><div class="metric-label">{label}</div>'
                    f'<div class="metric-value">{val}/10</div></div>',
                    unsafe_allow_html=True,
                )

        gauge_col, text_col = st.columns([1, 1.3])
        with gauge_col:
            fig = go.Figure(go.Indicator(
                mode="gauge+number",
                value=validation.get("overall_score", 0),
                number={"font": {"color": "#F1F3F9"}},
                gauge={
                    "axis": {"range": [0, 10], "tickcolor": "#8A8F98"},
                    "bar": {"color": "#6C5CE7"},
                    "bgcolor": "rgba(0,0,0,0)",
                    "steps": [
                        {"range": [0, 4], "color": "#3A1F2B"},
                        {"range": [4, 7], "color": "#3A331F"},
                        {"range": [7, 10], "color": "#1F3A2E"},
                    ],
                },
                title={"text": "Overall Viability", "font": {"color": "#F1F3F9"}},
            ))
            fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", height=280, margin=dict(l=20, r=20, t=50, b=10))
            st.plotly_chart(fig, use_container_width=True)

        with text_col:
            st.markdown('<div class="section-header">✅ Top Strengths</div>', unsafe_allow_html=True)
            for s in validation.get("top_strengths", []):
                st.markdown(f'<div class="list-row">{s}</div>', unsafe_allow_html=True)
            st.markdown('<div class="section-header">⚠️ Top Risks</div>', unsafe_allow_html=True)
            for rk in validation.get("top_risks", []):
                st.markdown(f'<div class="list-row">{rk}</div>', unsafe_allow_html=True)

        st.markdown('<div class="section-header">🧭 Recommendation</div>', unsafe_allow_html=True)
        st.info(validation.get("recommendation", ""))

    # ---- Market -----------------------------------------------------------
    with tabs[1]:
        c1, c2, c3, c4 = st.columns(4)
        for col, (label, val) in zip(
            [c1, c2, c3, c4],
            [
                ("TAM", f"${market.get('tam_usd_billion', '—')}B"),
                ("SAM", f"${market.get('sam_usd_billion', '—')}B"),
                ("SOM", f"${market.get('som_usd_billion', '—')}B"),
                ("CAGR", f"{market.get('cagr_percent', '—')}%"),
            ],
        ):
            with col:
                st.markdown(
                    f'<div class="metric-card"><div class="metric-label">{label}</div>'
                    f'<div class="metric-value">{val}</div></div>',
                    unsafe_allow_html=True,
                )
        st.markdown('<div class="section-header">📈 Key Trends</div>', unsafe_allow_html=True)
        for t in market.get("key_trends", []):
            st.markdown(f'<div class="list-row">{t}</div>', unsafe_allow_html=True)

        st.markdown('<div class="section-header">🎯 Target Audience</div>', unsafe_allow_html=True)
        ta = market.get("target_audience", {})
        st.write(f"**Primary segment:** {ta.get('primary_segment', '—')}")
        st.write(f"**Demographics:** {ta.get('demographics', '—')}")
        for p in ta.get("pain_points", []):
            st.markdown(f'<div class="list-row">😣 {p}</div>', unsafe_allow_html=True)

        st.markdown('<div class="section-header">📝 Summary</div>', unsafe_allow_html=True)
        st.write(market.get("market_summary", ""))

    # ---- Competitors --------------------------------------------------
    with tabs[2]:
        st.markdown(
            f'<div class="metric-card"><div class="metric-label">Competitive Intensity</div>'
            f'<div class="metric-value">{competitor.get("competitive_intensity", "—").upper()}</div></div>',
            unsafe_allow_html=True,
        )
        comps = competitor.get("competitors", [])
        if comps:
            fig = go.Figure(go.Bar(
                x=[c.get("name") for c in comps],
                y=[c.get("positioning_score") for c in comps],
                marker_color="#6C5CE7",
            ))
            fig.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font_color="#F1F3F9", height=320, title="Competitor Positioning Strength",
                margin=dict(l=20, r=20, t=50, b=10),
            )
            st.plotly_chart(fig, use_container_width=True)

        for c in comps:
            with st.expander(f"{c.get('name')} — {c.get('type', '').title()} competitor"):
                st.write("**Strengths:** " + ", ".join(c.get("strengths", [])))
                st.write("**Weaknesses:** " + ", ".join(c.get("weaknesses", [])))

        st.markdown('<div class="section-header">💡 Market Gap</div>', unsafe_allow_html=True)
        st.write(competitor.get("market_gap", ""))
        st.markdown('<div class="section-header">🎨 Differentiation Recommendation</div>', unsafe_allow_html=True)
        st.write(competitor.get("differentiation_recommendation", ""))

    # ---- Technical ------------------------------------------------------
    with tabs[3]:
        c1, c2, c3 = st.columns(3)
        for col, (label, val) in zip(
            [c1, c2, c3],
            [
                ("Feasibility Score", f"{technical.get('feasibility_score', '—')}/10"),
                ("MVP Timeline", f"{technical.get('mvp_timeline_weeks', '—')} weeks"),
                ("Team Size Needed", f"{technical.get('team_size_needed', '—')} engineers"),
            ],
        ):
            with col:
                st.markdown(
                    f'<div class="metric-card"><div class="metric-label">{label}</div>'
                    f'<div class="metric-value">{val}</div></div>',
                    unsafe_allow_html=True,
                )
        st.markdown('<div class="section-header">🧱 Recommended Stack</div>', unsafe_allow_html=True)
        st.write(", ".join(technical.get("recommended_stack", [])))
        st.markdown('<div class="section-header">⚠️ Key Technical Risks</div>', unsafe_allow_html=True)
        for risk in technical.get("key_technical_risks", []):
            st.markdown(f'<div class="list-row">{risk}</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-header">🔧 Build vs Buy</div>', unsafe_allow_html=True)
        st.write(technical.get("build_vs_buy_notes", ""))
        st.markdown('<div class="section-header">📝 Verdict</div>', unsafe_allow_html=True)
        st.write(technical.get("feasibility_summary", ""))

    # ---- Business Model -------------------------------------------------
    with tabs[4]:
        st.markdown(
            f'<div class="metric-card"><div class="metric-label">Business Model</div>'
            f'<div class="metric-value">{business_model.get("business_model", "—")}</div></div>',
            unsafe_allow_html=True,
        )
        st.markdown('<div class="section-header">💵 Revenue Streams</div>', unsafe_allow_html=True)
        for rs in business_model.get("revenue_streams", []):
            st.markdown(
                f'<div class="list-row"><b>{rs.get("name")}</b> — {rs.get("description")} '
                f'<i>({rs.get("pricing_hint")})</i></div>',
                unsafe_allow_html=True,
            )
        st.markdown('<div class="section-header">🏷️ Pricing Strategy</div>', unsafe_allow_html=True)
        st.write(business_model.get("pricing_strategy", ""))

        gtm = business_model.get("gtm_strategy", {})
        st.markdown('<div class="section-header">🚀 Go-To-Market</div>', unsafe_allow_html=True)
        st.write(f"**Phase 1 (Launch):** {gtm.get('phase_1_launch', '')}")
        st.write(f"**Phase 2 (Growth):** {gtm.get('phase_2_growth', '')}")
        st.write("**Primary channels:** " + ", ".join(gtm.get("primary_channels", [])))

        st.markdown('<div class="section-header">📏 Key Metrics to Track</div>', unsafe_allow_html=True)
        st.write(", ".join(business_model.get("key_metrics_to_track", [])))

    # ---- Financials -------------------------------------------------------
    with tabs[5]:
        proj = financial.get("yearly_projections", [])
        if proj:
            years = [p.get("year") for p in proj]
            revenue = [p.get("revenue_usd") for p in proj]
            customers = [p.get("customers") for p in proj]

            fig = go.Figure()
            fig.add_trace(go.Bar(x=years, y=revenue, name="Revenue ($)", marker_color="#6C5CE7"))
            fig.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font_color="#F1F3F9", height=320, title="3-Year Revenue Projection",
                xaxis_title="Year", yaxis_title="Revenue (USD)",
                margin=dict(l=20, r=20, t=50, b=10),
            )
            st.plotly_chart(fig, use_container_width=True)

            fig2 = go.Figure()
            fig2.add_trace(go.Scatter(x=years, y=customers, mode="lines+markers", name="Customers", line=dict(color="#4AD9C7", width=3)))
            fig2.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font_color="#F1F3F9", height=300, title="Customer Growth",
                xaxis_title="Year", yaxis_title="Customers",
                margin=dict(l=20, r=20, t=50, b=10),
            )
            st.plotly_chart(fig2, use_container_width=True)

        c1, c2 = st.columns(2)
        with c1:
            funding = financial.get("initial_funding_needed_usd", "—")
            st.markdown(
                f'<div class="metric-card"><div class="metric-label">Initial Funding Needed</div>'
                f'<div class="metric-value">${funding:,}</div></div>' if isinstance(funding, (int, float))
                else f'<div class="metric-card"><div class="metric-label">Initial Funding Needed</div><div class="metric-value">{funding}</div></div>',
                unsafe_allow_html=True,
            )
        with c2:
            breakeven = financial.get("breakeven_month", "—")
            st.markdown(
                f'<div class="metric-card"><div class="metric-label">Breakeven</div>'
                f'<div class="metric-value">Month {breakeven}</div></div>',
                unsafe_allow_html=True,
            )
        st.markdown('<div class="section-header">📋 Key Assumptions</div>', unsafe_allow_html=True)
        for a in financial.get("key_assumptions", []):
            st.markdown(f'<div class="list-row">{a}</div>', unsafe_allow_html=True)

    # ---- Investor Grilling (unique feature) ------------------------------
    with tabs[6]:
        st.markdown(
            "An AI VC has read your full analysis and prepared its **toughest questions**. "
            "Answer them below and get real, unfiltered feedback — great practice before a real pitch."
        )
        coordinator_for_qna = CoordinatorAgent(memory=st.session_state.memory)

        for idx, q in enumerate(investor_questions):
            st.markdown(
                f'<div class="question-card"><b>Q{idx+1}.</b> {q.get("question")}<br>'
                f'<span style="color:#9AA3B8; font-size:0.85rem;">Why it matters: {q.get("why_it_matters")}</span></div>',
                unsafe_allow_html=True,
            )
            answer_key = f"qna_answer_{idx}"
            answer = st.text_area(f"Your answer to Q{idx+1}", key=answer_key, height=90)

            if st.button(f"Get investor feedback on Q{idx+1}", key=f"qna_btn_{idx}"):
                if not answer or len(answer.strip()) < 5:
                    st.warning("Write an answer first.")
                else:
                    with st.spinner("The investor is thinking..."):
                        feedback = coordinator_for_qna.investor_qna_agent.score_answer(
                            q.get("question"), answer, r.get("idea_text", "")
                        )
                    st.session_state.qna_history[idx] = feedback

            if idx in st.session_state.qna_history:
                fb = st.session_state.qna_history[idx]
                st.success(f"**Strength rating: {fb.get('strength_rating')}/10** — {fb.get('feedback')}")
                if fb.get("follow_up_question"):
                    st.markdown(f"*Follow-up: {fb.get('follow_up_question')}*")
            st.markdown("---")

    # ---- Export -----------------------------------------------------------
    with tabs[7]:
        st.markdown('<div class="section-header">📥 Download Your Results</div>', unsafe_allow_html=True)

        pptx_bytes = r.get("pitch_deck_bytes")
        if pptx_bytes:
            st.download_button(
                "📊 Download Pitch Deck (.pptx)",
                data=pptx_bytes,
                file_name=f"{r.get('idea_title', 'startup').replace(' ', '_')}_pitch_deck.pptx",
                mime="application/vnd.openxmlformats-officedocument.presentationml.presentation",
                use_container_width=True,
            )

        report_md = f"""# {r.get('idea_title')} — AI Startup Analysis

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Verdict
**{validation.get('verdict', '').upper()}** — Score: {validation.get('overall_score')}/10

{validation.get('recommendation', '')}

## Market
- TAM: ${market.get('tam_usd_billion')}B | SAM: ${market.get('sam_usd_billion')}B | SOM: ${market.get('som_usd_billion')}B
- CAGR: {market.get('cagr_percent')}%
- {market.get('market_summary', '')}

## Competitors
{chr(10).join(f"- **{c.get('name')}** ({c.get('type')}) — positioning {c.get('positioning_score')}/10" for c in competitor.get('competitors', []))}

## Technical Feasibility
- Score: {technical.get('feasibility_score')}/10
- MVP timeline: {technical.get('mvp_timeline_weeks')} weeks
- {technical.get('feasibility_summary', '')}

## Business Model
- {business_model.get('business_model', '')}
- {business_model.get('pricing_strategy', '')}

## Financials
{chr(10).join(f"- Year {p.get('year')}: ${p.get('revenue_usd'):,} revenue, {p.get('customers')} customers" if isinstance(p.get('revenue_usd'), (int, float)) else str(p) for p in financial.get('yearly_projections', []))}
"""
        st.download_button(
            "📝 Download Full Report (.md)",
            data=report_md.encode("utf-8"),
            file_name=f"{r.get('idea_title', 'startup').replace(' ', '_')}_report.md",
            mime="text/markdown",
            use_container_width=True,
        )

        st.download_button(
            "🗂️ Download Raw Analysis (.json)",
            data=json.dumps(
                {k: v for k, v in r.items() if k != "pitch_deck_bytes"}, indent=2, default=str
            ).encode("utf-8"),
            file_name=f"{r.get('idea_title', 'startup').replace(' ', '_')}_analysis.json",
            mime="application/json",
            use_container_width=True,
        )
