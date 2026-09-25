# Workflow setup fixes

## Authorization and decisions

- User authorized all recommendations from the mysetup.ai/session comparison, then specifically removal of repeated checkpoint approval.
- Standing checkpoint authorization applies only to this repository; explicit no-commit requests still override it.
- Default Astra medium, credentials, generated stores and existing specialized tools/skills are preserved.
- Patched pi-ask-user 0.14.0 original source in its persistent local worktree, commit 8e00b35; no installed-file patch or publication.
- Rejected: forced delegation, a knowledge graph, automatic infinite continuation, mandatory human templates.

## Acceptance

| Outcome | Evidence / status |
|---|---|
| No repeated checkpoint approval | Verified: 46b77bd. Old policy failed the checkpoint case for Astra/Terra; changed policy passed 17 decision checks each, including no-commit and other-repository safeguards. |
| Meaningful ask-user decision boundary | Verified: original-source fix, 82 package tests, npm run check, full SDK extension load and live necessary/unnecessary-question scenarios. |
| Continue after questions; respect explicit stops; hand off work | Verified: real file/tool outcomes across Astra medium/high and Terra medium. Answer-before-write and fresh-session progress.md reads checked. Automatic compaction itself is not tested. |
| Partial review is not acceptance | Verified in paired incomplete/complete observation fixtures, and reviewer persona requires actual diff/evidence. Actual game/CI/reviewer execution is outside fixture coverage. |
| CI scope and reachable regression distinction | Verified across the same model matrix. Initial CI fixture lacked ls; corrected discoverability and reran the full matrix, without relaxing assertions. |
| Model comparison | Final report: /tmp/pi/workflow-eval-aPdaaR/report.json; summarized in evals/workflow-results.json with source hashes. All 30 outcome checks passed; unrelated check attempts were 0/1/6 for Astra medium/high/Terra medium. Keep default Astra medium. |
| Independent review | Completed source/acceptance review and focused correction follow-up: no remaining blockers. Local package portability is documented as a limitation, not a failing path on this machine. |

## Completion and limits

- Evaluator, recorded results and README committed as b5d204d after final diff and source-hash identity checks.
- Existing interactive Pi sessions need /reload or restart to load the patched package; no claim that their already-loaded tools changed.
- No guarantee of future model compliance or Teardown/gameplay acceptance; these are bounded setup regressions, not universal correctness proofs.
- Concurrent commits 9c7b18a, 4a33a18 and deda6ca were preserved. No unrelated launcher changes belong to this task.
