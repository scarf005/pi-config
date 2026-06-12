---
name: local-environment
description: Local machine and personal environment rules. Use when modifying local config, XDG environment variables, /tmp/pi, downloads, Termux phone files, or personal machine paths.
---

# Local Environment

- `/tmp/pi` may be modified.
- Use SI units and RFC 3339 timestamps.
- For XDG environment variables, update `~/.fish/config/conf.d/xdg.fish`.
- `phone` is Termux over Tailscale port `8022`; copy downloads with `scp <file> phone:~/storage/downloads/`.
- `/home/scarf/repo/cata/Cataclysm-BN` is the Cataclysm-BN main worktree; use it for upstream main automation unless the user explicitly requests another clone/worktree.
- On this KDE Wayland session, `loginctl IdleHint` stays `no` during ordinary idle time; do not use it as the gate for local idle automation. Prefer explicit blockers such as GameMode or game-like processes.
