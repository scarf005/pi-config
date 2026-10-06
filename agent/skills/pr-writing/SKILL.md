---
name: pr-writing
description: Write or edit pull request templates, titles, and bodies in plain, concise prose. Use when opening or updating a PR or changing a repository PR template; remove AI filler without losing reviewer-relevant facts.
---

# PR writing

- Read the repository template, contribution rules, actual diff, and validation results first. Match the repository's language and the author's existing voice.
- Use a short title naming the behavior that changes. Avoid claims such as "comprehensive", "robust", "seamless", or "production-ready".
- Open with the concrete problem or change. Do not announce the summary or repeat the title.
- Keep only facts a reviewer needs: changed behavior, compatibility, a necessary design choice, validation, and unresolved risks. Link related issues or commits instead of retelling their history.
- Fill required template fields. Remove optional empty sections, `N/A`, unused checklists, and instructions to the author. Preserve existing human prose, screenshots, links, and checklist state when editing a PR.
- Describe tests as an action and expected result. Separate observed results from untested paths; never turn a command's success into a deployment or runtime claim.
- Use ordinary sentences or short bullets. No bold-label lists, decorative icons, em dashes, forced three-part lists, invented objections, sales language, or repeated closing summaries.
- Avoid "This PR enhances...", "ensures...", "not just... but...", "key improvements", and similar framing. Name what changed and what it does.
- When creating a template, request only information reviewers actually use. Keep prompts in HTML comments, and omit generic motivation or redundant CI checklists.
- Before submitting, read the body once as a reviewer: delete every sentence that repeats another, says how the agent worked, or makes an unsupported claim. Keep required disclosure footers exactly once.

If the repository has no template, use only the sections needed:

```markdown
<Concrete change or problem, in one sentence.>

- <Important behavior or compatibility detail, if needed.>

## Testing

- <Action and observed result.>
- <Important path that remains untested, if any.>
```
