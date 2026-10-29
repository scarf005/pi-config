---
name: pr-writing
description: Write or edit pull request templates, titles, and bodies in plain, concise prose. Use when opening or updating a PR or changing a repository PR template; remove AI filler without losing reviewer-relevant facts.
---

# PR writing

- Read the repository template, contribution rules, actual diff, and validation results first. Match the repository's language and the author's existing voice.
- Use a short title naming the behavior that changes. Avoid claims such as "comprehensive", "robust", "seamless", or "production-ready".
- Open with the concrete problem or change. Do not announce the summary or repeat the title.
- Keep only facts a reviewer needs: changed behavior, compatibility, a necessary design choice, validation, and unresolved risks. Link related issues or commits instead of retelling their history.
- Why is one line: the symptom, plus the link where it was found when one exists. How is one line naming the approach. Do not retell the mechanism, constants, hand-computed figures (only measured results count), function names, or call paths; the diff shows them.
- Fill required template fields. Fill an optional section such as "alternatives considered" only with an option actually weighed and rejected during the work; never invent one to fill it. Remove optional empty sections, `N/A`, unused checklists, and instructions to the author. Preserve existing human prose, screenshots, links, and checklist state when editing a PR.
- Testing lists checks that were actually run and that the diff does not already show, each as an action and observed result. Do not restate test cases added in the diff, and do not add "suggested" manual checks nobody ran. Separate observed results from untested paths; never turn a command's success into a deployment or runtime claim. When manual testing is still pending, the whole section is `wip`.
- Use ordinary sentences or short bullets. No bold-label lists, decorative icons, em dashes, forced three-part lists, invented objections, sales language, or repeated closing summaries.
- Avoid "This PR enhances...", "ensures...", "not just... but...", "key improvements", and similar framing. Name what changed and what it does.
- When creating a template, request only information reviewers actually use. Keep prompts in HTML comments, and omit generic motivation or redundant CI checklists.
- Before submitting, read the body once as a reviewer: delete every sentence that repeats another, says how the agent worked, or makes an unsupported claim. Keep required disclosure footers exactly once.

Example body (shape and length only; the text is from one PR):

```markdown
## Purpose of change (The Why)

fix food rot estimation not taking temperature into account, found when testing <review link>

## Describe the solution (The How)

reuse temperature helper functions

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
