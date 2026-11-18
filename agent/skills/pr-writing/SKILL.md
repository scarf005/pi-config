---
name: pr-writing
description: Write or edit pull request templates, titles, and bodies, and existing PR or issue bodies, in plain, concise prose. Use when opening or updating a PR, editing a PR or issue body, or changing a repository PR template; remove AI filler without losing reviewer-relevant facts.
---

# PR writing

- Read the repository template, contribution rules, actual diff, and validation results first. Match the repository's language and the author's existing voice.
- Use `.github/pull_request_template.md` when present; fill only required fields with concrete bullets (no `N/A`), include concrete testing steps and expected results, and player-facing titles when changelog rules require them.
- Before writing a body, search related issues and PRs with `gh search` and link them; `close #N` (including open subissues) before full URLs.
- Before editing an existing PR or issue body, save its current body and patch it minimally, preserving human prose, checklists, media, and generated blocks; check a body-only diff. Replace stale bullets after follow-ups.
- Web UI PRs: attach `playwright-cli` screenshots as GitHub attachments or external URLs; never commit media unasked.
- Use a short title naming the behavior that changes. Avoid claims such as "comprehensive", "robust", "seamless", or "production-ready".
- Open with the concrete problem or change. Do not announce the summary or repeat the title.
- Keep only facts a reviewer needs: changed behavior, compatibility, a necessary design choice, validation, and unresolved risks. Link related issues or commits instead of retelling their history.
- Why is one line: the symptom in past tense, quoting on-screen text when there is some, plus the link where it was found when one exists. How is one line naming the approach as an imperative verb phrase, like a commit subject (`skip door lock check while the door is open`). Never make a thing the actor of a verb (`The X check applies only to Y`, `a vehicle keeps the lock`); use an imperative, or the player as subject. A symptom may still say a thing `breaks` or `fails`. When the reader needs the cause to follow it, How may instead be 2-3 numbered steps (cause, change, effect), with the cause told as player-visible behavior. Use player-visible names (menu labels, tileset names), not option keys or internal globals. Do not retell the mechanism, constants, hand-computed figures (only measured results count), function names, or call paths; the diff shows them.
- Fill required template fields. Fill an optional section such as "alternatives considered" only with an option actually weighed and rejected during the work; never invent one to fill it. Remove optional empty sections, `N/A`, unused checklists, and instructions to the author. Preserve existing human prose, screenshots, links, and checklist state when editing a PR.
- A Testing claim about a CI or remote run links that run, and a comparison ("same as before") also links the run it compares against; a claim with no link reads as unverified.
- Testing lists checks that were actually run and that the diff does not already show, each as an action and observed result; manual checks are numbered steps a player can repeat plus the expected result, never a past-tense log. Leave out unrelated defects seen while testing. Do not restate test cases added in the diff, and do not add "suggested" manual checks nobody ran. Separate observed results from untested paths; never turn a command's success into a deployment or runtime claim. When manual testing is still pending, the whole section is `wip`.
- Use ordinary sentences or short bullets. No bold-label lists, decorative icons, em dashes, forced three-part lists, invented objections, sales language, or repeated closing summaries.
- Avoid "This PR enhances...", "ensures...", "not just... but...", "key improvements", and similar framing. Name what changed and what it does.
- When creating a template, request only information reviewers actually use. Keep prompts in HTML comments, and omit generic motivation or redundant CI checklists.
- Before submitting, read the body once as a reviewer: delete every sentence that repeats another, says how the agent worked, or makes an unsupported claim. Keep required disclosure footers exactly once.

Example title and body (shape and length only; the text is from one PR):

```markdown
fix: allow removing vehicle door locks while its door is open

## Purpose of change (The Why)

fixes #10878. removing a door lock failed with "Unlock the attached lock first." even when the door was open.

## Describe the solution (The How)

skip door lock check while the door is open.

## Testing

wip
```

If the repository has no template, use only the sections needed:

```markdown
<Concrete change or problem, in one sentence.>

- <Important behavior or compatibility detail, if needed.>

## Testing

- <Action and observed result.>
- <Important path that remains untested, if any.>
```
