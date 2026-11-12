---
name: personal-repo
description: Set up a new git repository (local or GitHub) or write the README of one of the user's personal repositories. Use when asked to create a repository, initialize a project, or write or edit a personal repository's README.
---

# Personal repository

- A new repository gets a `LICENSE` file with the full AGPL-3.0 text (`gh api licenses/agpl-3.0 -q .body`) and
  declares `AGPL-3.0-only` in the manifest (`license` field); commit it with the first commit. Existing repositories
  keep their license.
- A personal repository's README includes at least one WebP screenshot (quality 50-75) of the project in use.
