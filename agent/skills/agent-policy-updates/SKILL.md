---
name: agent-policy-updates
description: Rules for correcting assistant mistakes and deciding whether to update AGENTS.md or other agent policy files. Use when the user corrects the assistant, after a major mistake, or before editing agent instruction/policy files.
---

# Agent Policy Updates

- Answer the correction first and fix the requested task now.
- If the user only asks to analyze, investigate, or explain, do not edit policy files unless they explicitly ask for policy-file changes.
- Do not edit `AGENTS.md` or other policy files just because a mistake happened.
- Update policy only for a concrete procedural or policy gap that a normal agent would likely repeat without a rule.
- Do not add policy for ordinary judgment errors, conversation-quality failures, common sense, one-off mistakes, or behavior already covered by existing rules.
- If policy needs changing, edit an existing rule where possible and keep the change general.
- Avoid incident-specific, tool-specific, or blame-shifting rules.
- For conduct or instruction mistakes, use global `AGENTS.md`; keep repo `AGENTS.md` files repo-specific.
