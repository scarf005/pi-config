# Pi configuration repository

- Before creating, moving, or adding files inside a skill directory, read Pi's complete `docs/skills.md`
- Before changing Pi resources or SDK integrations, read the relevant Pi docs completely and follow task-relevant
  cross-references/examples; do not recursively load unrelated documentation
- At implementation start, checkpoint pre-existing tracked changes in a separate commit without asking. This is standing
  authorization for this repository only, unless the user forbids commits. Exclude untracked/generated files and never
  mix the checkpoint with task changes
- Before each commit, require no tracked unstaged paths and inspect `git status --short` plus
  `git diff --cached --name-status`
- Treat `agent/models-store.json`, sessions, installed packages, credentials, and runtime artifacts as generated or
  user-owned unless the task explicitly targets them
- Validate policy changes with behavior-focused evaluations and report effective global prompt size, not only parse or
  load success
