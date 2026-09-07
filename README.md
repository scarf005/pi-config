# pi config

Personal pi coding agent configuration.

SPDX-License-Identifier: AGPL-3.0-only

## Godot MCP + isolated computer-use (game desktop)

Launches a dedicated Xvfb display, session DBus and AT-SPI accessibility bus,
openbox, the Godot MCP server, and Pi's computer-use tools
(`@injaneity/pi-computer-use`). Requires system `xvfb-run openbox xdotool
xdpyinfo` and `at-spi-bus-launcher`, `at-spi2-registryd`; Godot 4.7.2 is
pinned under `agent/bin/godot-4.7.2` (ignored) and chromium under Playwright's
cache.

### Launch

```sh
~/.config/pi/bin/pi-game           # Pi with computer-use + Godot MCP inside the isolated desktop
```

`bin/godot-mcp` refuses to start outside the isolated desktop
(`PI_GAME_DESKTOP=1` with a real `DISPLAY` and session DBus). This marker guard
is advisory only, not a security sandbox.

### Validation

```sh
# Integration: loads real Pi SDK extensions, no LLM tokens; verifies Godot MCP
# handshake/version, project run, native window discovery + screenshot,
# coordinate click + R key reaching Godot, managed-browser input and WebGL2.
timeout 170 ~/.config/pi/bin/game-desktop node ~/.config/pi/tests/game-tools.mjs

# Launcher boundaries: outside-display rejection, exit-code propagation,
# inherited display/bus scrub, runtime-dir cleanup.
node ~/.config/pi/tests/launcher.mjs
```

### Known residuals

- Xvfb is GPU-less: Godot uses llvmpipe/software GL (audio falls back to the
  dummy driver; VSync warning is expected). Managed chromium is launched via
  `bin/pi-chrome` with `--enable-unsafe-swiftshader` for WebGL2.
- `agent/models-store.json` is generated/user-owned and left untracked.
- Godot MCP `npm audit` reports a DNS-rebinding advisory on its pinned SDK;
  the server is stdio-only with no HTTP listener, so it is not exploitable
  through this setup.
