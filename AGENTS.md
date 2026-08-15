# Pi configuration repository

- Before editing agent policy, load `agent-policy-updates`
- Before creating, moving, or adding files inside a skill directory, read Pi's complete `docs/skills.md`
- Read the relevant Pi docs and linked examples completely before changing extensions, skills, prompts, themes, models,
  settings, or SDK integrations
- If tracked changes exist when a task starts and commits are allowed, immediately commit them as a separate checkpoint
  before new edits; never mix them with task changes
- Before each commit, require no tracked unstaged paths and inspect `git status --short` plus
  `git diff --cached --name-status`
- Treat `agent/models-store.json`, sessions, installed packages, credentials, and runtime artifacts as generated or
  user-owned unless the task explicitly targets them
- Validate policy changes with behavior-focused evaluations and report effective global prompt size, not only parse or
  load success
