---
name: gui-capture
description: Launch games and GUI apps off the live desktop and capture screenshots or animations of them. Use before any automated run that needs rendered frames (gameplay, UI, visual checks, screenshots, recordings) and when showing captures in PRs, reports or replies.
---

# GUI capture

- Run headless (`godot --headless`, or the engine's equivalent) whenever the run needs no rendered frame.
- Never open a window on the live desktop: it takes the user's mouse focus. A repository rule naming `xvfb-run` does
  not override this (with `WAYLAND_DISPLAY` set, the app still opens on the desktop). Prefix every command that can
  start the app, wrappers and test recipes included, with `env -u WAYLAND_DISPLAY -u DISPLAY`.
- Runs that need frames: launch muted in headless gamescope.
  1. Run with `PULSE_SINK=agent_mute`. Create that one shared null sink only when it is missing
     (`pactl list short sinks | rg -q '\sagent_mute\s' || pactl load-module module-null-sink sink_name=agent_mute`)
     and never unload it: a killed run skips its cleanup, so per-run sinks pile up in the desktop's output list
     (hook `null_sink.py`). Sound only when asked.
  2. `gamescope --backend headless -W 1920 -H 1080 -w 1920 -h 1080 -- <cmd>`.
  3. Capture with `GAMESCOPE_WAYLAND_DISPLAY=gamescope-0 gamescopectl screenshot <path>`.
  Not Xvfb: its OpenGL is software llvmpipe, gamescope's is hardware.
- Give every automated launch a private config and data profile (Cataclysm `--userdir X/ --configdir X/config/`, else
  `XDG_CONFIG_HOME`/`HOME`); a run must never read or rewrite the user's real settings.
- When motion is what changed or what is judged (animation, gameplay, UI transitions), show it as an animation
  (animated WebP) in PRs, reports and replies; stills only for static looks.
- Capture only verified task windows, never unrelated desktop content. Save screenshots in the repository's
  `.screenshots/` (else the working directory's), in task-specific subfolders, and show relevant ones with paths.
