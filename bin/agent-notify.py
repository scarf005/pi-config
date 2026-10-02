#!/usr/bin/env python3
"""Send lifecycle notifications for main sessions, never subagents."""

import json
import os
from pathlib import Path
import subprocess
import sys


def main():
    # pi-subagent propagates this marker to Pi, Claude, and Codex children.
    if os.environ.get("PI_SUBAGENT_DEPTH", "0") != "0":
        return
    try:
        event = json.loads(sys.argv[2]) if len(sys.argv) > 2 else json.load(sys.stdin)
    except (ValueError, OSError):
        return
    if not isinstance(event, dict) or event.get("agent_id"):
        return
    if event.get("hook_event_name") != "Stop":
        return
    cwd = event.get("cwd") or os.getcwd()
    name = {"pi": "pi", "claude": "Claude Code", "codex": "Codex"}[sys.argv[1]]
    title = f"pi@{cwd}" if sys.argv[1] == "pi" else f"{name}@{cwd}: 작업 완료"
    message = event.get("last_assistant_message") or f"작업 완료: {Path(cwd).name}"
    try:
        subprocess.run(
            [str(Path.home() / ".local/bin/notify"), "--id", cwd, title, message[:2000]],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL, timeout=8, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        pass  # Notification delivery must not interrupt the agent.


if __name__ == "__main__":
    main()
