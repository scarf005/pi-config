---
name: source-backed-changes
description: Source-backed data, content, media, live-site, controls, compatibility, and artifact changes. Use when modifying sourced records/assets, mirroring media, correcting live content, or asserting exact runtime/source identity.
---

# Source-backed changes

- Inspect the exact user-provided page, record, asset, screenshot, recording, log, or artifact first
- For UI complaints, identify the exact visible view, component, toolbar, and state before editing
- Preserve the exact visible asset role, crop, and source intent; do not substitute thumbnails, portraits, banners, or
  full-body images for each other
- Inspect directly linked detail pages before declaring requested fields unavailable; represent genuinely unavailable
  source data as unavailable or disabled instead of inventing values
- Verify app/game controls, keybindings, and menu paths from relevant code or docs before giving exact instructions
- Validate the exact reported record, field, asset identity, and UI state; string presence, successful builds, and
  deploy status are insufficient
- Verify final served media by MIME type, dimensions, or inspected render, not only filename or URL
- For source-tree-dependent behavior, use a binary/tool built from the target source and revision; do not substitute
  installed packages, Flatpaks, or unrelated worktrees unless their revision matches
- Do not claim a live URL is fixed until the commit is pushed and deployment is verified; label local-only validation
  explicitly
