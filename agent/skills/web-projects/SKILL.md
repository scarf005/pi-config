---
name: web-projects
description: Web project implementation and validation rules. Use when creating or modifying web UI, frontend apps, Preact, Vite, Deno tests, browser-visible changes, or web references.
---

# Web Projects

- Bootstrap web projects from `https://github.com/scarf005/preset`.
- Keep UI minimal: no extra copy, branding, badges, links, gradients, animation, or border radius unless requested or required.
- Match existing component styling before accepting native/browser or design-system defaults that change the visual language.
- Default to white theme; support `prefers-color-scheme`.
- Preact: prefer Signals/deepsignal; avoid hooks unless architecture/library boundaries require them.
- Preact event handlers: use `event.currentTarget.value` directly; do not cast typed targets like `(event.currentTarget as HTMLInputElement).value`.
- TypeScript/JavaScript in web projects: do not introduce ordinary `function` declarations or expressions; use `const` arrow functions for helpers, components, callbacks, and exported utilities. Use `function` only when the syntax/API requires it (e.g., overload declarations, generators, methods) and state that exception before coding.
- Use Vite `base: "./"`.
- Test web projects and browser-visible changes with `playwright-cli`; use the repo's actual dev server/routes for screenshots when available, create a temporary real page fixture when needed, capture the full page unless the user explicitly asks for a cropped element, upload the images to a gist, and link the raw gist URLs in the PR body instead of committing the image files.
- For web references, include direct links and check `/llms.txt` when relevant.
- Before changing Deno tests, read Deno testing, snapshot, and fast-check Deno docs.
