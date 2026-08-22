# PageForge — Project Skills & Agents

## Available Skills (invoke with /skill-name)

| Skill | Description |
|-------|-------------|
| `/commit` | Conventional Commit with lint/type/test checks |
| `/adr` | Create/update Architecture Decision Record |
| `/add-trace` | Add Langfuse tracing to a node or service |
| `/db-migration` | Create Alembic migration (tenant_id, downgrade) |
| `/debug-rag` | Diagnose RAG quality problems step by step |
| `/deletion-cascade` | GDPR Art.17 cascading deletion via DeletionService |
| `/frontend-design` | Distinctive visual design guidance |
| `/ingest-stage` | Add/modify ingestion pipeline stage |
| `/langgraph-node` | Add/modify LangGraph node |
| `/model-registry-update` | Register new LLM or embedding model |
| `/new-endpoint` | Add REST endpoint (RBAC, audit log, tests) |
| `/prompt-version` | Version a prompt template |
| `/rag-eval` | Run RAG quality evaluation vs baseline |
| `/reindex-collection` | Re-index Qdrant after embedding model change |
| `/rodo-audit` | GDPR compliance audit |
| `/tenant-isolation-check` | Audit tenant isolation (auth/RBAC/retrieval) |

## Available Agents (used automatically or via Agent tool)

- `architect` — ADRs, structural decisions, module boundaries
- `backend-dev` — endpoints, commands, repositories, migrations
- `data-engineer` — Drizzle schema, query optimization
- `design` — UX flows, API contracts, component layout
- `microservices` — Docker Compose, BullMQ, Prometheus, Grafana, R2
- `ml-engineer` — model selection, eval dataset, context management
- `security-auditor` — auth, JWT, tenant isolation audits
- `python-reviewer` — general code reviewer
- `rag-engineer` — RAG pipeline specialist
