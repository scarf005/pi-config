---
name: autonomous-review-loop
description: Drive authorized implementation through small tasks, independent review, fixes, and tests until no actionable findings remain. Use for explicit review-until-clean or autonomous end-to-end implementation requests, not routine edits or read-only questions.
---

# Autonomous review loop

Based on
[Humans are always the bottleneck](https://kdy1.dev/2026-9-6-humans-are-always-the-bottleneck).
Spend human attention on decisions, intent, and final judgment, not routine
coordination.

## Establish the contract

- Read the exact request and target before planning. Record the intended
  outcome, constraints, non-goals, acceptance checks, and authorized publication
  boundary in a compact working summary.
- Resolve ordinary implementation details from evidence. Ask only for unresolved
  decisions that affect the user's contract; do not silently substitute a
  preferred architecture or behavior.
- Keep the original intent available to every reviewer. Review feedback is a
  hypothesis, not new authority.

## Bound and execute the work

- Split large work into small, independently verifiable tasks. Each handoff
  needs scope, relevant evidence, expected behavior, dependencies, and
  validation commands; bug reports need a concrete reproducer.
- Keep dependent work ordered. Continue independent authorized work while
  another task or decision is pending.
- Delegate only when requested or when independent review is required by
  acceptance, risk, or scope. Keep one writer per worktree; use fresh-context
  reviewers with distinct, bounded review angles.
- Use available models according to task difficulty and cost; do not copy the
  article's model names or install its services. Do not create issues, PRs, or
  extra branches without authorization.

## Review, fix, and verify

1. Implement one bounded change and run the repository's format, build, and
   relevant behavior checks.
2. Have independent reviewers inspect the actual changed revision and its
   callers, tests, and contract. Require a concrete failure scenario or a
   substantive simplification, not speculative polish.
3. Synthesize findings before editing. Fix verified, in-scope defects at their
   cause; reject feedback that changes intent or adds unnecessary machinery. Ask
   if a real fix requires an unapproved decision.
4. Add minimal regression coverage for observable behavior, including relevant
   failure paths. Avoid tests that merely match source text, duplicate coverage,
   or encode incidental implementation details.
5. Rerun affected checks and review the updated revision. Repair branch-owned CI
   failures and merge conflicts within the authorized scope. Check for sibling
   instances of the same failure class.
6. Repeat until a fresh review finds no actionable issues and required
   validation passes. If a blocker, unavailable check, or resource limit
   prevents completion, report it explicitly rather than calling the result
   clean. Do not loop on optional polish or manufacture changes to keep
   reviewers busy.

## Finish without overstating confidence

- Recheck the final diff against the original intent, including compatibility,
  recovery paths, excessive tests, and unnecessary direction changes. Run
  relevant performance checks for performance-sensitive work.
- Report the exact tested revision, observed checks, disposition of findings,
  and unverified paths. "No findings" means the reviewers found none within the
  checked scope, not proof that no bugs exist.
- Before publishing, verify the outgoing revision matches the final reviewed and
  tested tree; rerun affected checks after any intervening change. Commit and
  publish only within the user's authorization.
- A clean review or bot approval is a review-queue signal, not permission to
  merge; leave final merge judgment to the human unless explicitly delegated.
