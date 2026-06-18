---
name: investigate
description: Use when the user asks to investigate, analyze, diagnose, research, or explain an issue before fixing it; when they want plan-mode-style read-only exploration; or when they ask for related issues/PRs and fix options with pros and cons.
---

# Investigate

Use this skill for read-only diagnosis and solution exploration. It is a planning/investigation workflow, not an implementation workflow.

## Safety Gate

- Do not make irrevocable changes.
- Do not edit files, commit, push, open/update PRs/issues, run migrations, delete files, install packages, or change external state unless the user explicitly authorizes that action.
- Prefer read-only commands and diagnostics. If a command could mutate state, ask first or explain why it is needed.
- Treat temporary local notes under `/tmp/pi` as allowed only when useful for investigation artifacts.

## Workflow

1. **Quick answer first**
   - Send a desktop notification early with the current concise answer or investigation direction:
     ```bash
     ~/.local/bin/notify --id "$PWD" "조사 시작" "현재 판단과 다음 확인 대상을 한 문장으로 알립니다"
     ```
   - Keep this notification brief; do not wait for exhaustive research.

2. **Establish context**
   - Identify the repo/root and applicable instructions.
   - Check `git status --short` before any repository inspection.
   - Read the user-provided references/artifacts first.
   - Inspect exact files, logs, screenshots, errors, or commands relevant to the reported issue.

3. **Find related work**
   - Search the local repo history, issues, PR references, docs, changelog, and tests for related behavior.
   - If the repo is on GitHub and network/auth is available, use `gh search issues` and `gh search prs` or equivalent targeted searches.
   - Include direct related URLs only when found; omit a related-links section if none are found.

4. **Diagnose with evidence**
   - Separate confirmed facts from hypotheses.
   - Identify the behavior contract/invariant and where it is enforced.
   - For bugs, trace from symptom to likely root cause before proposing fixes.
   - Note blockers or missing evidence instead of guessing.

5. **Present multiple fix paths**
   - Provide at least two viable approaches when possible.
   - For each approach, include:
     - What would change
     - Pros
     - Cons/risks
     - Validation needed
   - Recommend one approach and explain the deciding reason.

## Final Response Shape

- Lead with the direct finding or current best answer.
- Include related issues/PRs only if discovered.
- Include fix options with pros and cons.
- State what was not verified or what evidence is still missing.
- Do not claim anything is fixed unless the user authorized implementation and validation was completed.
