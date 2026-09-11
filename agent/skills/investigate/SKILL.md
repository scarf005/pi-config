---
name: investigate
description: Read-only diagnosis of concrete bugs/incidents, explicit plan-mode exploration, or related issue/PR and fix-option research. Not for ordinary explanations, factual lookups, or routine inspection during authorized implementation.
---

# Investigate

Use this skill for read-only diagnosis and solution exploration, not implementation. Ordinary explanations, local fact
lookups, and inspection within an authorized coding task do not trigger this workflow.

## Safety Gate

- Do not make irrevocable changes.
- Do not edit files, commit, push, open/update PRs/issues, run migrations, delete files, install packages, or change external state unless the user explicitly authorizes that action.
- Prefer read-only commands and diagnostics. If a command could mutate state, ask first or explain why it is needed.
- Treat temporary local notes under `/tmp/pi` as allowed only when useful for investigation artifacts.

## Workflow

1. **Notify only when cause is found**
   - Do not send start/progress notifications such as "will start investigating" or "조사 시작".
   - Send a desktop notification only after the actual cause/root cause is identified with evidence:
     ```bash
     ~/.local/bin/notify --id "$PWD" "원인 확인" "증거로 확인한 실제 원인을 한 문장으로 알립니다"
     ```
   - If the cause is not found, do not send an investigate-skill notification.

2. **Establish context**
   - Start with the user-provided references/artifacts and exact files, logs, screenshots, errors, or commands relevant to
     the reported issue.
   - Identify the repo/root and applicable instructions only as needed for those targets; do not use broad workspace or
     parent-directory scans as a routine preflight.
   - Check `git status --short` before editing or when ownership of an inspected file matters.

3. **Find related work**
   - Search the local repo history, issues, PR references, docs, changelog, and tests for related behavior.
   - If the repo is on GitHub and network/auth is available, use `gh search issues` and `gh search prs` or equivalent targeted searches.
   - Search by the issue number/URL, exact title or symptom text, and the implicated symbols/files discovered during diagnosis.
   - Check whether an existing open or merged PR already fixes the reported issue before proposing new implementation work; inspect candidate PR file lists/diffs rather than relying on titles.
   - For bugs, actively attempt to identify the likely introducing commit and PR before finalizing: inspect blame/log/diffs around implicated code, search PRs by commit/title/files/symbols, and use focused bisect-style checks when feasible. If a culprit is identified, label it explicitly as the likely/confirmed introducing commit/PR with the evidence; do not bury it in a generic related-work list. If a culprit cannot be identified, state the exact blocker and confidence level.
   - Do not infer relatedness from adjacent issue/PR numbers; numbers are not evidence. If an adjacent or nearby number looks relevant, inspect it only as an ordinary search result or explicit reference.
   - For open PRs, also check PRs touching the implicated files/symbols when text search may miss the relationship; inspect candidate file lists/diffs before deciding whether they fix the issue.
   - Track the exact related issue/PR queries or local searches performed.
   - Investigation final responses MUST always state related issue/PR status: list each found issue/PR with its number, title, and direct URL, or state that no related issues/PRs were found in the searched scope and name the searched scope/queries.

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
- For bug investigations, include a separate `Likely introducing change` or `Confirmed introducing change` item before `Related issues/PRs`; cite the commit/PR, title, URL when available, and the evidence. If unknown, say so with the blocker/confidence.
- Always include a concise `Related issues/PRs` item for investigation results, even when none were found; include each found issue/PR's number, title, and direct URL, and include searched scope/queries for empty results.
- Include fix options with pros and cons.
- State what was not verified or what evidence is still missing.
- Do not claim anything is fixed unless the user authorized implementation and validation was completed.
