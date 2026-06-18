# MODEL_ROUTING.md — Alibaba Copilot

Model tier selection for dispatching agents.

## Agent Routing Table

| Agent | Task Type | Default Model | Rationale |
|---|---|---|---|
| orchestrator | Coordination, routing | qwen-plus | Low-token orchestration; balanced cost |
| spec-writer | Spec authoring | qwen-max | High-quality structured output needed |
| tdd-agent | Test authoring | qwen-plus | Medium reasoning; high volume |
| implementer | Code implementation | qwen-plus | Balanced reasoning; bulk of tokens |
| code-reviewer | Code review (CUPID) | qwen-plus | Pattern matching; balanced cost |
| integration-agent | CHANGELOG, PR, merge | qwen-flash | Low reasoning; fast turnaround |
| advocatus-diaboli | Adversarial review | qwen-max | Deep counterfactual reasoning needed |
| choice-cartographer | Decision archaeology | qwen-plus | Structured analysis; medium reasoning |
| carpaccio | Task slicing | qwen-plus | Structured decomposition |
| harness-enforcer | Constraint checks | qwen-flash | Deterministic verification |
| harness-gc | Garbage collection | qwen-flash | Staleness detection; low reasoning |

## Token Budget Guidance

| Agent | Typical Input | Typical Output | Est. Tokens |
|---|---|---|---|
| orchestrator | 2,000 | 500 | 2,500 |
| spec-writer | 3,000 | 4,000 | 7,000 |
| tdd-agent | 4,000 | 3,000 | 7,000 |
| implementer | 5,000 | 2,000 | 7,000 |
| code-reviewer | 8,000 | 2,000 | 10,000 |
| integration-agent | 1,000 | 500 | 1,500 |
| advocatus-diaboli | 6,000 | 3,000 | 9,000 |
| choice-cartographer | 4,000 | 3,000 | 7,000 |
| harness-enforcer | 3,000 | 1,000 | 4,000 |
| harness-gc | 2,000 | 500 | 2,500 |
