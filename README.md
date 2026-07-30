# MechMate AI — Multi-Agent Bike Repair Management System

A unified AI-powered application where six independent agents communicate automatically to manage the complete bike repair workflow.

---

## Architecture

```
Customer Request
      ↓
POST /workflow/start  (Orchestrator — port 8004)
      ↓
Agent 1 → Customer Intake     (port 8000)
      ↓
Agent 2 → AI Diagnosis        (port 8001)
      ↓
Agent 3 → Inventory           (port 8002)
      ↓
Agent 5 → Repair Status       (built-in)
      ↓
Agent 4 → Smart Billing       (port 8003)
      ↓
Agent 6 → Notifications       (built-in)
      ↓
Final JSON response
```

---

## Project Structure

```
bike_store/
├── backend/
│   ├── main.py                  # FastAPI app + CORS
│   ├── agent_orchestrator.py    # Central 6-agent coordinator
│   ├── agent_clients.py         # HTTP clients for Agents 1–4
│   ├── repair_status_agent.py   # Agent 5 (built-in)
│   ├── notification_agent.py    # Agent 6 (built-in)
│   ├── routes.py                # All API endpoints
│   ├── models.py                # SQLAlchemy ORM models
│   ├── schemas.py               # Pydantic schemas
│   ├── database.py              # SQLite connection
│   ├── requirements.txt
│   └── .env
└── frontend/
    └── src/
        ├── App.jsx
        ├── api/orchestratorApi.js
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── StatCard.jsx
        │   └── WorkflowTimeline.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── StartWorkflow.jsx
            ├── WorkflowHistory.jsx
            ├── WorkflowDetail.jsx
            ├── IntakePage.jsx
            ├── DiagnosisPage.jsx
            ├── InventoryPage.jsx
            ├── RepairPage.jsx
            ├── BillingPage.jsx
            └── NotificationsPage.jsx
```

---

## Setup & Run

### 1. Start all 4 external agent services

Each agent runs on its own port. Start them in separate terminals:

```bash
# Agent 1 — Customer Intake
uvicorn main:app --port 8000

# Agent 2 — AI Diagnosis
uvicorn main:app --port 8001

# Agent 3 — Inventory Intelligence
uvicorn main:app --port 8002

# Agent 4 — Smart Billing
uvicorn main:app --port 8003
```

### 2. Start the Orchestrator (port 8004)

```bash
cd bike_store/backend
pip install -r requirements.txt
uvicorn main:app --port 8004 --reload
```

### 3. Start the Frontend (port 5174)

```bash
cd bike_store/frontend
npm install
npm run dev
```

Open: http://localhost:5174

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workflow/start` | Execute full 6-agent workflow |
| GET | `/workflow/history` | List all workflow runs |
| GET | `/workflow/{id}` | Get workflow with logs |
| GET | `/workflow/{id}/outputs` | Get all agent outputs |
| GET | `/dashboard/stats` | Dashboard statistics |
| GET | `/repairs` | List all repair records |
| GET | `/repairs/{id}` | Get single repair |
| GET | `/notifications` | List all notifications |
| GET | `/inventory/stats` | Inventory statistics (proxy) |
| GET | `/inventory/low-stock` | Low stock items (proxy) |
| GET | `/billing/all` | All invoices (proxy) |

### Workflow Start Payload

```json
{
  "customer_details": {
    "customer_name": "John Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "address": "123 Main St"
  },
  "bike_details": {
    "bike_model": "Honda CB300R",
    "brand": "Honda",
    "registration_number": "MH01AB1234",
    "manufacturing_year": 2022,
    "fuel_type": "Petrol"
  },
  "complaint": "Brake making noise when applied"
}
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `workflow_runs` | One row per workflow execution |
| `workflow_logs` | Per-agent log entries with timestamps |
| `agent_outputs` | JSON output from each agent |
| `repair_records` | Central repair record linked by `repair_id` |
| `notifications` | Customer notification log |

---

## Frontend Pages

| Route | Page | Agent |
|-------|------|-------|
| `/` | Dashboard | All |
| `/workflow` | Start Workflow | Orchestrator |
| `/history` | Workflow History | All |
| `/history/:id` | Workflow Detail | All |
| `/intake` | Customer Intake | Agent 1 |
| `/diagnosis` | AI Diagnosis | Agent 2 |
| `/inventory` | Inventory | Agent 3 |
| `/repair` | Repair Status | Agent 5 |
| `/billing` | Billing | Agent 4 |
| `/notifications` | Notifications | Agent 6 |

---

## Environment Variables

`backend/.env`
```
APP_TITLE=MechMate AI Orchestrator
```

Each individual agent service manages its own AI API keys (OpenRouter / Amazon Bedrock).
