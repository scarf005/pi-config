# Pi configuration repository

- Before creating, moving, or adding files inside a skill directory, read Pi's complete `docs/skills.md`
- Before changing Pi resources or SDK integrations, read the relevant Pi docs completely and follow task-relevant
  cross-references/examples; do not recursively load unrelated documentation
- If tracked changes exist at task start, ask permission before committing user-owned changes as a separate checkpoint.
  If permission is declined, preserve them and leave task changes uncommitted; never mix the two
- Before each commit, require no tracked unstaged paths and inspect `git status --short` plus
  `git diff --cached --name-status`
- Treat `agent/models-store.json`, sessions, installed packages, credentials, and runtime artifacts as generated or
  user-owned unless the task explicitly targets them
- Validate policy changes with behavior-focused evaluations and report effective global prompt size, not only parse or
  load success
