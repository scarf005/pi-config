---
name: autonomous-review-loop
description: Drive authorized implementation to observed user acceptance with bounded independent review, fixes, and tests. Use for explicit review-until-clean or autonomous end-to-end implementation requests, not routine edits or read-only questions.
---

# Autonomous review loop

Based on
[Humans are always the bottleneck](https://kdy1.dev/2026-9-6-humans-are-always-the-bottleneck).
Spend human attention on decisions, intent, and final judgment, not routine
coordination. The goal is the requested result, not a clean review queue.

## Establish observable acceptance

- Read the exact request, targets and supplied references before planning. For
  multi-step work, maintain one short worktree-local state document: reuse the
  task's existing plan, otherwise use `progress.md` without committing it unless
  requested. Record authorized scope and publication boundary, decided/rejected/
  open choices, each outcome's scenario, pass condition, evidence and status
  (unverified, verified, blocked), and the next action. The agent maintains it;
  do not ask the user to fill a template or create one for a trivial edit.
- Update that document when a decision, evidence or status changes, not after
  every tool call. Read it on continuation or after compaction and pass its path
  to delegates; verify it against current user instructions and revision before
  acting. It preserves context, not permission to revive an unrelated old task.
- Derive pass conditions from the user's desired result, not from the code you
  chose to implement. Do not silently replace an outcome with a helper, class,
  mechanism, smaller scope or conveniently passing fixture.
- For reference-based requests such as "match X", inspect the actual reference
  and compare the relevant observable behavior or output. Shared terminology or
  implementation techniques do not establish equivalence. An unavailable
  reference is an acceptance gap, not permission to invent a substitute.
- Broad words such as "all", "every" and "throughout" require coverage across
  the requested categories, states and interactions. One successful example
  does not verify the whole request. Keep untested requirements in the ledger.
- Resolve ordinary implementation details from evidence. Ask only for decisions
  that affect the user's contract; report a real blocker rather than redefining
  success to avoid it.

## Bound the work and gather evidence

- Split implementation into small, independently verifiable tasks, but keep
  their relationship to the full acceptance ledger explicit. Order dependent
  work; continue independent authorized work while another task is pending.
  Bug fixes need a concrete reproducer of the reported behavior.
- Run the requested user path on the target revision. Visual and behavioral
  acceptance requires inspecting the actual output and interactions, not just
  builds, internal state, object counts or tests of a directly called helper.
  Label mocks, staged captures and disabled systems as limited fixtures; do not
  use them as proof of ordinary end-to-end behavior.
- A missing, failed or unobserved acceptance check blocks that completion claim.
  Investigate or obtain the missing evidence instead of commissioning more code
  reviews for confidence. A narrowly scoped diagnostic review can help identify
  a blocker, but cannot clear the untested requirement.
- Delegate only when requested or required by acceptance, risk or scope. Keep
  one writer per worktree. Choose available models and budgets to fit the
  scoped work and cost constraints. Do not create branches, issues or PRs
  without authorization, or copy the article's model names or install its services.

## Give reviewers a falsifiable question

- Distinguish **acceptance review** (does the delivered result satisfy the full
  request?) from **code review** (does this implementation contain defects?).
  Both questions must be addressed before implementation sign-off; they need
  not require separate agents. A clean narrow code review cannot answer the
  acceptance question.
- Supply the original request and references, acceptance ledger including gaps,
  exact revision and actual diff, relevant callers, and observed validation
  artifacts. Check the reviewer's available tools; provide a diff or evidence
  they cannot obtain themselves. A commit ID or claimed test summary alone is
  not a substitute for inspectable material.
- Separate observations from your interpretations. Do not frame your own
  correctness claims as unquestionable inherited decisions. Reviewers must be
  able to challenge the implementation and tests against the user's contract;
  user constraints remain authoritative.
- Ask what requested behavior is absent, approximated or only fixture-tested,
  as well as what code is incorrect. Require reachable scenarios and concrete
  impact; do not manufacture findings from artificially corrupted state.
- Record what each reviewer actually inspected or executed. Source-only review
  is not independent runtime validation. Missing access or unavailable evidence
  must remain visible in the result.

## Fix, verify and stop for the right reason

1. Implement a bounded change and run the relevant repository checks. Test
   observable behavior, including boundaries, failure paths and interactions;
   do not encode incidental implementation details merely to obtain green tests.
2. Review when justified above. Treat findings as hypotheses: verify them, fix
   confirmed in-scope defects at their cause, and reject changes that substitute
   a different goal or add unnecessary machinery.
3. Rerun affected checks on the changed revision and update the acceptance
   ledger. Repair branch-owned CI failures and merge conflicts within scope.
   Reproduce a suspected unrelated CI failure on the base before attributing it;
   do not alter runners, limits or dependencies merely to make unrelated CI green.
   Check sibling paths for the same demonstrated failure class.
4. Re-review only to verify an actionable fix, a material new change, or a named
   uncovered acceptance/risk question. State which gap the next review closes.
   Do not add overlapping reviewers or repeat the same scope just to collect
   reassuring conclusions. If only runtime evidence is missing, obtain it.
5. A partial, timed-out or budget-exhausted review is **incomplete, not approval**.
   Preserve useful findings, but do not convert silence or "no further findings"
   into a clean verdict. Resolve the specific uncovered work or report it; do
   not blindly retry just to obtain a completed status.
6. Stop when the requested acceptance checks are observed, required review is
   complete, and no verified actionable findings remain. If any requirement is
   blocked or unverified, report partial completion instead. Do not loop on
   optional polish. A new user-visible failure reopens the affected requirement;
   earlier passing fixtures do not rebut the report.

## Report results, not review volume

- Report verified outcomes, unresolved requirements and exact evidence on the
  tested revision. Review count, tokens spent, successful builds and "no
  findings" are not evidence of reference parity, universal correctness or
  completion. Keep local fixes separate from fulfillment of the overall task.
- Late or duplicate review notifications are bookkeeping, not new validation.
  Do not repeat completion assurances when no new evidence has arrived. Process
  genuinely new findings and disclose any changed status.
- Recheck the final diff against the full contract, including compatibility,
  recovery paths, unnecessary machinery and performance-sensitive behavior.
  Before publishing, ensure the outgoing revision matches the reviewed and
  tested tree; rerun affected checks after intervening changes.
- Commit and publish only within authorization. A clean review or bot approval
  does not grant permission to merge; leave that judgment to the human unless
  explicitly delegated.
