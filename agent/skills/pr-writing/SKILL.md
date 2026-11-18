---
name: pr-writing
description: Write or edit pull request templates, titles, and bodies, and existing PR or issue bodies, in plain, concise prose. Use when opening or updating a PR, editing a PR or issue body, or changing a repository PR template; remove AI filler without losing reviewer-relevant facts.
---

# PR writing

- Read the repository template, contribution rules, actual diff, and validation results first. Match the repository's language and the author's existing voice.
- Use `.github/pull_request_template.md` when present; fill only required fields with concrete bullets (no `N/A`), include concrete manual testing steps and expected results, and player-facing titles when changelog rules require them.
- Before writing a body, search related issues and PRs with `gh search` and link them; `close #N` (including open subissues) before full URLs.
- Before editing an existing PR or issue body, save its current body and patch it minimally, preserving human prose, checklists, media, and generated blocks; check a body-only diff. Replace stale bullets after follow-ups.
- PRs that change gameplay, UI, or game data (no-op data refactors included, showing the unchanged behavior still working) show the affected behavior working in Testing as an image (animated WebP for a sequence): `playwright-cli` for web, a frame from an `asciinema` recording of the curses build for terminal games. Host it as a GitHub attachment or on a fork branch `assets/<slug>`; never commit media to the PR branch unasked.
- Use a short title naming the behavior that changes. Avoid claims such as "comprehensive", "robust", "seamless", or "production-ready".
- Open with the concrete problem or change. Do not announce the summary or repeat the title.
- Keep only facts a reviewer needs: changed behavior, compatibility, a necessary design choice, validation, and unresolved risks. Link related issues or commits instead of retelling their history.
- Why is one line. When it closes an issue that already states the symptom, Why is the closing keyword alone (`fixes #N`); a follow-up is the link plus a few words of reason (`continuation of #N cause they are now redundant`), never a retelling of what the linked PR explains. Otherwise it is the symptom in past tense, quoting on-screen text when there is some, plus the link where it was found when one exists. In an issue body, quote the reporter's words verbatim in a blockquote instead of paraphrasing them. How is one line naming the approach as an imperative verb phrase, like a commit subject (`skip door lock check while the door is open`). Never make a thing the actor of a verb (`The X check applies only to Y`, `a vehicle keeps the lock`); use an imperative, or the player as subject. A symptom may still say a thing `breaks` or `fails`. A PR with several independent changes lists each as one imperative bullet with its reason in a short parenthesis (`reduce Linux test runners 4 -> 2 (prevent runner depletion)`); never drop the reason. When the reader needs the cause to follow it, How may instead be 2-3 numbered steps (cause, change, effect), with the cause told as player-visible behavior. Use player-visible names (menu labels, tileset names), not option keys or internal globals. For a data or modding change, title and How name the changed JSON identifiers in backticks (quality `PRY`, use action `CROWBAR`) instead of paraphrasing them (`from the prying quality definition`). Do not retell the mechanism, constants, hand-computed figures (only measured results count), function names, or call paths; the diff shows them.
- Fill required template fields. Fill an optional section such as "alternatives considered" only with an option actually weighed and rejected during the work; never invent one to fill it. Remove optional empty sections, `N/A`, unused checklists, and instructions to the author. Preserve existing human prose, screenshots, links, and checklist state when editing a PR.
- A Testing claim about a CI or remote run links that run, and a comparison ("same as before") also links the run it compares against; a claim with no link reads as unverified.
- Local test, lint, and data-check runs are one line (`local tests pass`), never a list of commands or test names. The capture is the observed result of its manual check and goes under that line, after a few words naming what it shows (`crowbar still works`), never a narration of the frames. Testing lists other checks that were actually run and that the diff does not already show, each as an action and observed result; manual checks are numbered steps a player can repeat plus the expected result, never a past-tense log. Leave out unrelated defects seen while testing. Do not restate test cases added in the diff, and do not add "suggested" manual checks nobody ran. Separate observed results from untested paths; never turn a command's success into a deployment or runtime claim. When manual testing or the capture is still pending, the whole section is `wip`.
- Use ordinary sentences or short bullets. No bold-label lists, decorative icons, em dashes, forced three-part lists, invented objections, sales language, or repeated closing summaries.
- Avoid "This PR enhances...", "ensures...", "not just... but...", "key improvements", and similar framing. Name what changed and what it does.
- When creating a template, request only information reviewers actually use. Keep prompts in HTML comments, and omit generic motivation or redundant CI checklists.
- Before submitting, read the body once as a reviewer: delete every sentence that repeats another, says how the agent worked, or makes an unsupported claim. Keep required disclosure footers exactly once.

Example title and body (shape and length only; the text is from one PR):

```markdown
fix: allow removing vehicle door locks while its door is open

## Purpose of change (The Why)

fixes #10878

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
