---
name: web-projects
description: Web project implementation and validation rules. Use when creating or modifying web UI, frontend apps, Preact, Vite, Deno tests, browser-visible changes, or web references.
---

# Web Projects

- Bootstrap web projects from `https://github.com/scarf005/preset`.
- Keep UI minimal: no extra copy, branding, badges, links, gradients, animation, or border radius unless requested or required.
- Default to white theme; support `prefers-color-scheme`.
- Preact: prefer Signals/deepsignal; avoid hooks unless architecture/library boundaries require them.
- Use Vite `base: "./"`.
- Test web projects and browser-visible changes with `playwright-cli`; attach screenshots for web UI PRs.
- For web references, include direct links and check `/llms.txt` when relevant.
- Before changing Deno tests, read Deno testing, snapshot, and fast-check Deno docs.
