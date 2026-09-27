# Project skills

The skills in this folder are copied from Anthropic's **Engineering** plugin
(`engineering` v1.2.0 in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins),
commit `da38ec1`), so every Claude Code session on this repo has them —
cloud, desktop or CLI — without installing the plugin per account.

Licensed under Apache-2.0; see `LICENSE-engineering-plugin`. `../CONNECTORS.md`
is copied alongside because several skills link to it. The plugin's
`.mcp.json` (Slack, Linear, Asana, Jira, Notion, PagerDuty, Datadog) was
deliberately left out — this project doesn't use those tools.

| Skill | Use it for |
|---|---|
| `code-review` | Security / performance / correctness review of a PR, diff or files |
| `debug` | Structured reproduce → isolate → diagnose → fix session |
| `deploy-checklist` | Pre-release checklist (pairs with `DEPLOYMENT_CHECKLIST.md`) |
| `architecture` | Architecture decision records (ADR) with trade-offs |
| `system-design` | Designing a new component or service |
| `tech-debt` | Finding and prioritising technical debt |
| `testing-strategy` | Planning what and how to test |
| `documentation` | READMEs, runbooks, API docs |
| `incident-response` | Production incident triage and postmortems |
| `standup` | Daily standup update from recent work |

Invoke with `/<skill-name>` (e.g. `/code-review backend/controllers/orderController.js`),
or just describe the task — Claude picks the matching skill automatically.

To update: re-copy `engineering/skills/*/SKILL.md` and `engineering/CONNECTORS.md`
from the upstream repo.
