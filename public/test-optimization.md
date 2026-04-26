# ITA-Alpha — Intuit Tax Advisor Platform

## What This Project Is

ITA-Alpha is a **Python agent service** (FastAPI + LangGraph) that provides personalized tax advisory and estimation capabilities. It is both a **conversational agent** (users ask questions, agent responds) and a **platform API** (programmatic consumers send structured data, receive JSON results).

Two core capabilities:
- **Tax Insights** — apply IRS-based tax strategies and return actionable savings recommendations with dollar impacts
- **Tax Estimation** — project tax liability for a target year from current or prior year data, with iterative what-if overrides

## Required Plugin: pdlc-orchestrator

ITA-Alpha consumes the [pdlc-orchestrator](https://github.intuit.com/smewara/pdlc-orchestrator) plugin for base skill content (product, design, architecture, coding, review, shipping). Project-specific overlays live under `skills/<role>/` and are paired with the plugin's base role skills at runtime.

**Claude Code (automatic):** On first open of this repo, Claude Code reads `.claude/settings.json` and prompts to install `pdlc-orchestrator` from the committed marketplace URL. Accept the prompt — no manual `/plugin marketplace add` step is needed.

**Cursor (one-time setup):** Cursor does not support project-scope auto-install. Run once in a Cursor agent session:

```
/plugin marketplace add https://github.intuit.com/smewara/pdlc-orchestrator.git
/plugin install pdlc-orchestrator@pdlc-orchestrator
```

Verify: `/plugin list` should show pdlc-orchestrator enabled. A `.cursor/rules/pdlc-plugin.mdc` rule reminds the agent about this dependency. See the [plugin README → Cursor section](https://github.intuit.com/smewara/pdlc-orchestrator#cursor) for alternative methods.

**Local development on the plugin itself:** Authors/contributors to `pdlc-orchestrator` may keep a user-scope local-directory install at `~/.claude/settings.json` pointing at their working copy; that coexists with this project-scope wiring.

**Plugin priority:** When both pdlc-orchestrator and superpowers are installed, pdlc-orchestrator is the primary orchestrator for all development lifecycle tasks (implementing features, working on tickets, building from requirements). Superpowers skills are composed automatically for Phases 6-9 (Plan, Implement, Validate, Ship) when `phase_engine: superpowers` is set in `pdlc.config.yaml` or toggled per session with "use superpowers". Do not route development tasks through superpowers' standalone workflows (writing-plans, subagent-driven-development) — let pdlc-orchestrator coordinate the pipeline and delegate to superpowers where configured.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LANGGRAPH AGENT ("ita-alpha")                     │
│                                                                     │
│  ┌───────────┐     ┌────────────────────────────────────────────┐  │
│  │ ASSISTANT │────▶│ TOOLS                                      │  │
│  │   (LLM)   │     │  CdcUserTool ─── CDC (profiles)           │  │
│  │           │     │  CdcCompanyTool── CDC (company)            │  │
│  │ Reasons,  │◀────│  QBRetrieverTool─ GenOS RAG (QB)           │  │
│  │ explains  │     │  TTRetrieverTool─ GenOS RAG (tax)          │  │
│  └───────────┘     │  TaxAdvisorTool── Tax Advisor Engine ──┐   │  │
│                    └──────────────────────────────────────┼──┘  │
│                                                          ▼      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ TAX ADVISOR ENGINE (shared instance, pure Python)         │   │
│  │ TaxPlanBuilder → StrategyRegistry → StrategyExecutor      │   │
│  │   401(k) | HSA | Charitable (auto-discovered, topo-sorted)│   │
│  │ TaxCalculator (LLM) → OutputGenerator (insights)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Endpoints: POST /v1/agent/invoke (conversational)               │
│             POST /v1/tax-advisor/analyze (direct API)            │
└──────────────────────────────────────────────────────────────────┘
        │                    │
        ▼                    ▼
   GenOS/LXS (LLM)    CDC / QuickBooks / RAG
```

## Key Directory Structure

```
app/
├── engine/                    # Tax Advisor Engine (pure Python library)
│   ├── tax_advisor_engine.py  #   Core orchestrator (routes to insights or estimation)
│   ├── tax_plan.py            #   Central working object (extended for estimation)
│   ├── tax_plan_builder.py    #   Builds plan from tax data
│   ├── tax_state.py           #   Running tax state (frozen Pydantic model)
│   ├── calculator/            #   TaxCalculator interface + LLM implementation + IRS bracket data
│   ├── strategies/            #   Strategy plugin system (auto-discovery, dependency resolution)
│   ├── insights/              #   Insights workflow (TaxInsightsGenerator)
│   ├── estimation/            #   Estimation workflow (override merger, delta calculator)
│   ├── outputs/               #   Output formatters (ABC + insights + estimation)
│   └── persistence/           #   TaxPlanRepository (Redis session-scoped)
├── extraction/                # Document extraction pipeline (pluggable)
├── models/                    # Pydantic data models (request/response/tax data)
├── router/                    # FastAPI endpoints
│   ├── agent_router.py        #   POST /v1/agent/invoke
│   └── tax_advisor_router.py  #   POST /v1/tax-advisor/analyze
├── service/
│   ├── agent/                 # LangGraph agent
│   │   ├── agent.py           #   StateGraph with router node + skill branches
│   │   ├── skills/            #   Skills layer (auto-discovered)
│   │   │   ├── skill.py       #     Skill base class
│   │   │   ├── registry.py    #     SkillRegistry (auto-discovery)
│   │   │   ├── router.py      #     LLM-based intent router
│   │   │   ├── tax_advisory_skill.py
│   │   │   ├── tax_estimation_skill.py
│   │   │   └── general_skill.py
│   │   ├── tools/             #   Agent tools (TaxAdvisor, TaxEstimation, CDC, QB, RAG)
│   │   ├── example_prompt.py  #   General prompt (used by general_skill)
│   │   ├── tax_advisor_prompt.py   Advisory prompt (used by tax_advisory_skill)
│   │   └── tax_estimation_prompt.py Estimation prompt (used by tax_estimation_skill)
│   ├── agent_service.py       #   Agent invocation
│   └── agent_init.py          #   Startup: graph + router registration
├── adapters/                  # External service clients (UPI, IPS cache)
├── evaluation/                # Eval 2.0 framework
└── test/                      # Tests (unit + integration)

common/                        # Shared config, auth, logging
│   └── common_config.py       #   Environment-based settings (Local/QAL/E2E/PRD)

.env.example                   # Env var reference — cp to .env for local overrides

skills/                        # Project overlays for pdlc-orchestrator plugin (PROJECT.md per role; references/python/ for Python-specific overlays)
├── architecture/              #   PROJECT.md
├── code-review/               #   PROJECT.md
├── coding-standards/          #   PROJECT.md + references/python/ (Intuit examples, tooling-config)
├── experience-design/         #   PROJECT.md
├── product-management/        #   PROJECT.md
├── security/                  #   PROJECT.md + references/python/ (PII-safe logging, auth patterns)
├── shipping/                  #   PROJECT.md
└── testing-conventions/       #   PROJECT.md + references/python/ (pytest-intuit)

# Base SKILL.md and generic references come from the installed pdlc-orchestrator plugin — do not duplicate them here.
# Language-specific overlays live under references/<language>/ and are auto-loaded by the orchestrator when that language is detected.

docs/
├── superpowers/specs/         # Technical design document (3 formats: .md, .html, .gdoc.html)
├── superpowers/plans/         # Implementation plans
├── strategy-author-guide.md   # How to add new tax strategies
├── live-validation-guide.md   # How to test with real LLM
└── milestones/                # Milestone summaries

scripts/                       # Validation and testing scripts
```

## Tech Stack

- **Python 3.11+**, **FastAPI**, **Pydantic v2**
- **LangGraph** — agent orchestration (StateGraph with assistant + tools nodes)
- **LangChain** — tool framework (BaseTool), LLM integration (ChatOpenAI)
- **GenOS/LXS** — Intuit's LLM proxy (model: `gpt-41-mini-2025-04-14-oai`)
- **Redis (IPS Cache)** — state persistence (session-scoped)
- **Langfuse** — tracing and observability
- **pytest** — testing with `--noconftest` for engine tests, `@pytest.mark.anyio` for async
- **Poetry** — dependency management
- **Black + isort** — code formatting

## The One Agent

There is currently **one LangGraph agent** (`ita-alpha`) with this graph:

```
__start__ → router → assistant → tools → assistant → __end__
```

The **router** classifies user intent per message via LLM and selects the active skill (tax_advisory, tax_estimation, or general). The **assistant** loads the active skill's prompt dynamically.

The agent has these tools available (configured via `enabled_tool_list` in settings):
- `TaxAdvisorTool` — calls the tax advisory engine
- `CdcUserTool` / `CdcCompanyTool` — fetch user/company profiles from CDC
- `QBRetrieverTool` / `TTRetrieverTool` — RAG retrieval for QB/tax knowledge

## TaxAdvisorTool — Agent-to-Engine Bridge

`app/service/agent/tools/tax_advisor_tool/tax_advisor_tool.py`

This is the **bridge** between the LangGraph agent and the pure-Python tax advisory engine. It is NOT the engine itself — it's the adapter that translates between agent-world (flat LLM tool parameters) and engine-world (nested AdvisoryTaxData model).

**What it does on each call:**
1. Receives flat params from the LLM (filing_status, wages, age, etc.)
2. Translates them into `AdvisoryTaxData` via `_build_tax_data()`
3. Gets the shared `TaxAdvisorEngine` instance (created once, reused)
4. Refreshes GenOS auth headers from the agent context
5. Calls `engine.analyze()` which runs all strategies
6. Formats the response dict into readable text via `_format_analysis_result()`
7. Returns text for the agent LLM to explain conversationally

**Engine lifecycle:** The engine is created lazily on first call and reused. It is NOT recreated per request. Strategies are auto-discovered once from `app/engine/strategies/`. Auth headers are refreshed from agent context on each call since IAM tokens expire.

**Known limitation:** Uses a mock Redis client for plan persistence within the tool. This is acceptable because the agent's own checkpointer handles conversation state, and plan results are returned inline. When standalone plan persistence is needed, replace the mock with a real async Redis client.

## Strategy Plugin System

Strategies live in `app/engine/strategies/`. Each strategy:
- Implements `TaxStrategy` ABC
- Declares `reads` and `writes` fields (for automatic dependency resolution)
- Is auto-discovered at startup (drop a file = registered)
- Runs in topologically-sorted order (cascading AGI effects handled correctly)

**Adding a new strategy requires updating 3 things:**
1. Strategy file in `app/engine/strategies/` (the code)
2. Strategy-critical fields in `TaxAdvisorPrompt` (`app/service/agent/tax_advisor_prompt.py`) — so the conversational agent asks the user for inputs the strategy needs
3. If new input fields are needed: add to `PlanningContext` or `TaxReturnData`, `TaxAdvisorInput`, and `_build_tax_data()`

**Why the prompt matters:** The direct API works with defaults, but the conversational agent only asks for fields listed in the prompt. If a new strategy needs a field the prompt doesn't mention, the agent won't ask, the field defaults to $0/None, and results are inaccurate.

Full guide: `docs/strategy-author-guide.md`.

## 4 Plugin Interfaces

| Interface | Location | Current Implementation |
|-----------|----------|----------------------|
| `TaxStrategy` | `app/engine/strategies/tax_strategy.py` | 401(k), HSA, Charitable |
| `TaxCalculator` | `app/engine/calculator/tax_calculator.py` | LLMCalculator |
| `ExtractorPlugin` | `app/extraction/extractor_plugin.py` | LLMExtractor |
| `OutputGenerator` | `app/engine/outputs/output_generator.py` | TaxInsightsGenerator |

## Key Design Decisions

1. **Engine is a pure Python library** — no LangGraph/FastAPI dependencies. Testable and portable.
2. **Strategies use declarative dependency resolution** — `reads`/`writes` → topological sort → correct execution order. No manual ordering.
3. **LLM calculator is swappable** — behind `TaxCalculator` interface. Can be replaced with deterministic math or external service.
4. **LLM calculator uses chain-of-thought with embedded IRS brackets** — `irs_brackets.py` provides authoritative bracket data per year (standard deductions, bracket thresholds, SALT cap, valid marginal rates). The prompt requires 9 step-by-step computation steps, the calculator validates consistency post-response (AGI <= gross, taxable <= AGI, effective rate check, valid bracket), and retries once on failure. `temperature=0` on the ChatOpenAI instance eliminates sampling variance.
5. **Session-scoped persistence** — Redis now, designed for user-scoped DB upgrade (same `TaxPlanRepository` interface).
6. **TaxState is frozen** — `ConfigDict(frozen=True)`. Use `model_copy(update={...})` for modifications.
7. **Tax year is a first-class parameter** — flows through every layer. No hardcoded year anywhere.

## Data Model: IRS 1040-Aligned (Schema v2.0)

`AdvisoryTaxData` is structured as Option B — 1040-aligned `tax_return` + situational `planning_context`:

```
AdvisoryTaxData
├── tax_year: str                     # required
├── filing_status: FilingStatus       # required
├── tax_return: TaxReturnData         # 1040-aligned (income, adjustments, deductions, credits, payments)
│   └── income.wages                  # required — minimum viable input
└── planning_context: PlanningContext  # NOT on 1040 (age, HDHP, dependents, state)
```

**Field tiers:**
- **Required:** `tax_year`, `filing_status`, `tax_return.income.wages` — validation fails without these
- **Strategy-critical:** `traditional_401k`, `hsa_contributions`, `age`, `has_hdhp`, itemized details — strategies assume $0/None if missing
- **Enrichment:** interest, dividends, credits, payments, state — improves accuracy, defaults silently

**Schema version:** Response includes `"schema_version": "2.0"`. Additive changes (new fields, new strategies) don't bump the version. Structural changes do.

**State extensibility:** `tax_return` can gain a `state: list[StateReturn]` field in the future. Federal strategies unaffected.

**1040 document upload:** A uploaded 1040 maps directly to `tax_return`. Only `planning_context` needs additional input.

See ADR-008 in the design doc for full rationale.

## Tax Year Handling

The capability works for any tax year. Different years have different IRS limits, brackets, and phase-outs. Tax year flows through every layer with a priority chain:

**Direct API** (`POST /v1/tax-advisor/analyze`):
```
tax_data.tax_year (explicit in data) → options.tax_year (request-level) → "2024" (fallback)
```

**Conversational Agent** (via TaxAdvisorTool):
```
LLM tool param (user specified year) → agent_context.query_params.tax_year → current year (dynamic)
```

**How it works in the engine:**
- `AdvisoryTaxData.tax_year` — required field, validated as 4-digit string
- `StrategyRegistry.get_applicable()` — filters strategies by `tax_plan.tax_year` matching `strategy.tax_years`
- Each strategy has year-specific constants (e.g., `CONTRIBUTION_LIMITS = {"2024": {...}, "2025": {...}}`)
- If a strategy has no limits for the requested year → `eligible=False` with clear reason
- `LLMCalculator` prompt includes authoritative IRS bracket data injected from `irs_brackets.py` — the LLM does NOT rely on training-data recall for brackets/deductions. The prompt requires step-by-step computation (9 steps) with a self-check, and the calculator validates consistency post-response.

**Adding support for a new tax year:** Two places to update:
1. Strategy constants — update each strategy file (e.g., add `"2026": {"under_50": 24000, ...}` when IRS publishes new limits, typically Oct-Nov of the prior year)
2. IRS bracket data — add entries for the new year in `app/engine/calculator/irs_brackets.py` (STANDARD_DEDUCTIONS, TAX_BRACKETS, SALT_CAPS, VALID_MARGINAL_RATES_BY_YEAR). The rest of the system picks it up automatically.

## ADR-007: Agent Is an Investment (Re-evaluate If Unused)

The LangGraph agent is used for the conversational interface, but for the current single-tool, single-workflow use case, a direct conversational API would be simpler (2 LLM calls vs. 5-6). The agent is an **investment in future capability** — it pays off when multiple tools, multiple workflows (Skills layer), and multi-turn memory are active.

The engine is agent-agnostic — a direct endpoint is always a viable alternative if the agent overhead isn't justified. **Any re-evaluation or change to this decision requires explicit direction from the project owner.** Do not initiate on your own.

See ADR-007 in `docs/superpowers/specs/2026-04-02-tax-advisory-engine-design.md` for full rationale.

## Prompt Selection (Skill-Driven, Dynamic Per Message)

The agent's workflow logic is driven by the **Skills layer**. The router classifies user intent per message and loads the matching skill's prompt dynamically.

```
Every message:
  User message → Router (LLM classifies: ~50 tokens, ~300ms) → Skill selected
  → Skill's prompt loaded → LLM invoked with skill prompt + tools → response
```

**Three prompts exist (one per skill):**
- `app/service/agent/tax_advisor_prompt.py` — Tax advisory: gather data → call TaxAdvisorTool → explain strategies
- `app/service/agent/tax_estimation_prompt.py` — Tax estimation: determine mode → gather data → call TaxEstimationTool → show projections → support what-if
- `app/service/agent/example_prompt.py` — General: generic financial assistant (fallback)

The prompt is selected per message based on router classification — NOT statically at startup. This enables seamless cross-workflow conversations (estimation → advisory in the same chat).

## Skills Layer (C2 Architecture)

The agent uses a **Skills layer with LLM-based router** to route user intent to the right workflow per message. This replaces the static config-driven prompt selection.

```
Agent → Router (LLM classifies intent per message) → Skill (prompt + tools) → Engine
```

**Skills are auto-discovered** from `app/service/agent/skills/`:
- `tax_advisory_skill` — TaxAdvisorPrompt + TaxAdvisorTool (strategies, savings)
- `tax_estimation_skill` — TaxEstimationPrompt + TaxEstimationTool (projections, what-if)
- `general_skill` — ExampleAgentPrompt (general questions)

**Router:** LLM classification per message (~50 tokens, 1 token response, ~300ms). Prompt auto-generated from skill descriptions. Users can seamlessly switch between estimation and advisory within one conversation.

**Adding a new skill:** Create a file in `skills/`, define skill_id, prompt, tools, description. Router auto-discovers it. Same pattern as strategies.

See ADR-010 in `docs/superpowers/specs/2026-04-08-tax-estimation-design.md`.

## Tax Estimation Workflow

Second workflow alongside tax insights. Estimates tax liability for a target year.

**Two modes:**
- **Current year:** Provide 2024 data → compute estimated position
- **Prior year projection:** Provide 2023 data + known changes → project to 2024 with updated rules

**Request fields:** `options.prior_year_data` (prior year base), `options.overrides` (absolute value changes merged onto base)

**Response:** Estimated position, delta breakdown (income changes vs. rule changes), refund/owed calculation.

**Iterative:** User adjusts overrides across turns, engine re-projects each time. Baseline preserved.

See `docs/superpowers/specs/2026-04-08-tax-estimation-design.md` for full design.

## Running Locally

**Note:** Python 3.11+ is required (`.python-version` set via pyenv).

```bash
# First-time setup (handles venv, Poetry, dependencies, pre-commit)
./scripts/setup.sh

# Or manual setup
pyenv install 3.11.11   # if not already installed
python -m venv .venv && source .venv/bin/activate
pip install poetry --upgrade && poetry install

# Start server
PYTHONPATH=$(pwd) APP_ENV=local poetry run uvicorn app.service.server:app --port 8090

# Test with mock LLM (no server needed)
poetry run python scripts/validate_engine.py            # insights + estimation workflows
poetry run python scripts/validate_api.py               # API contract
poetry run python scripts/validate_conversational.py    # agent flow simulation

# Test with real LLM
./scripts/test_live_agent.sh
streamlit run scripts/chat_app.py
```

## Testing

```bash
# All tests (engine + models + extraction + skills + agent)
poetry run python -m pytest app/test/unit/engine/ app/test/unit/models/ app/test/unit/extraction/ app/test/unit/router/test_tax_advisor_router.py app/test/unit/service/agent/skills/ app/test/unit/service/agent/test_agent_router_integration.py --noconftest -v

# Quick (engine only)
poetry run python -m pytest app/test/unit/engine/ app/test/unit/models/ --noconftest -q
```

## Configuration

Environment-based settings in `common/common_config.py`:
- `LocalSettings` — local dev (debug logging, mock UPI, TaxAdvisorTool enabled)
- `PreProdSettings` — QAL/E2E base
- `ProdSettings` — STG/PRD base
- `enabled_tool_list` — controls which tools the agent loads
- `llm_base_url` — GenOS LLM endpoint
- `enforce_internal_user_access` — set `False` for local testing

## Auth Pattern

GenOS/LXS uses IAM headers, not API keys. `ChatOpenAI(api_key=...)` sends `Authorization: Bearer <key>` which **conflicts** with the IAM `Authorization` header. The fix: pass IAM auth via `extra_headers` on each `ainvoke()` call, which overrides the Bearer token.

- `api_key` in ChatOpenAI is a placeholder — GenOS ignores it when `extra_headers` has `Authorization`
- **All LLM calls** (agent assistant, router, tool calculators) must pass `extra_headers` with IAM headers
- Agent assistant: `extra_headers=intuit_header` on `llm_with_tools.ainvoke()` (in `agent.py`)
- Router: `skill_router.set_auth_headers(headers)` → passed on `ainvoke()` (in `router.py`)
- Tool calculators: `calculator.set_auth_headers(headers)` → passed on `ainvoke()` (in `llm_calculator.py`)
- Auth headers extracted from `agent_context.get_header()` in `RunnableConfig`
- Local testing: `X-Forwarded-Port: 8090` header bypasses mesh auth check

## Conversation State (Multi-Turn)

**Critical for consumers:** `metadata.interactionGroupId` in the agent request is what maintains conversation context across messages. The checkpointer uses `thread_id` (derived from `interactionGroupId + experience_id + user_id`) to store/retrieve conversation state.

| Consumer Behavior | interactionGroupId |
|-------------------|-------------------|
| Multi-turn conversation | Same value across all messages in the session |
| Fresh conversation | Different value per call |
| Resume prior session | Same value from that session |

**State persistence by environment:**
- **Local:** `MemorySaver` (in-memory) — state lost on server restart
- **Production:** `AsyncRedisSaver` (IPS Cache) — persists across restarts, works with multiple server instances. Enabled via `use_ips_cache: True` in `ProdSettings`.
- **UPI Conversation History** (optional, disabled) — long-term interaction storage for resuming sessions across days. Not required for basic multi-turn. Todo for production hardening.

## Documentation

- **Technical Design:** `docs/superpowers/specs/2026-04-02-tax-advisory-engine-design.md`
- **Strategy Guide:** `docs/strategy-author-guide.md`
- **Live Testing Guide:** `docs/live-validation-guide.md`
- **Milestone 1 Summary:** `docs/milestones/milestone-1-tax-advisory-engine.md`
- **ADR Template:** `skills/intuit-tax-advisor/architecture/references/architecture-template.md`
- **Document Format Standard:** `skills/intuit-tax-advisor/architecture/references/document-formats.md`

---

## Related Repositories

| Repository | Purpose |
|---|---|
| [`ita-alpha-config`](https://github.intuit.com/finplan-taxplan/ita-alpha-config) | Environment-specific configuration (QAL, E2E, STG, PRD) |
| [`ita-alpha-deployment`](https://github.intuit.com/finplan-taxplan/ita-alpha-deployment) | Kubernetes deployment manifests and ArgoCD configuration |


## Build Commands

```bash
# Add your build/run commands here
npm run dev    # Start development server
npm run build  # Production build
```