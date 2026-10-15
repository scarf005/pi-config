import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("agent_notify", ROOT / "bin/agent-notify.py")
notify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notify)


class NotifyTests(unittest.TestCase):
    def invoke(self, event, provider="claude", depth=None, argv_payload=False):
        args = ["agent-notify.py", provider]
        if argv_payload:
            args.append(json.dumps(event))
        env = {} if depth is None else {"PI_SUBAGENT_DEPTH": depth}
        with patch.dict(os.environ, env, clear=True), patch.object(sys, "argv", args), \
                patch.object(sys, "stdin", io.StringIO(json.dumps(event))), \
                patch.object(notify.subprocess, "run") as run:
            notify.main()
        return run

    def test_root_stop_all_providers(self):
        for provider in ("pi", "claude", "codex"):
            with self.subTest(provider=provider):
                run = self.invoke({"hook_event_name": "Stop", "cwd": "/tmp/a b",
                                   "last_assistant_message": "검증 완료: $(never-run)"},
                                  provider, argv_payload=provider == "pi")
                self.assertEqual(run.call_count, 1)
                args = run.call_args.args[0]
                self.assertEqual(args[1:3], ["--id", "/tmp/a b"])
                titles = {"pi": "pi@/t/a b", "claude": "CC@/t/a b: 작업 완료",
                          "codex": "cdx@/t/a b: 작업 완료"}
                self.assertEqual(args[-2], titles[provider])
                self.assertEqual(args[-1], "검증 완료: $(never-run)")

    def test_all_notifications_include_working_directory(self):
        for provider in ("pi", "claude", "codex"):
            for cwd in (None, "/tmp/a b", "/"):
                with self.subTest(provider=provider, cwd=cwd):
                    run = self.invoke({"hook_event_name": "Stop", "cwd": cwd}, provider,
                                      argv_payload=provider == "pi")
                    self.assertIn(f"@{notify.short_path(cwd or os.getcwd())}", run.call_args.args[0][-2])

    def test_short_path_matches_fish_prompt_pwd(self):
        home = str(Path.home())
        for path, expected in (
            (home, "~"), (f"{home}/repo/Cataclysm-BN", "~/r/Cataclysm-BN"),
            (f"{home}/.config/pi/bin", "~/.c/p/bin"), ("/usr/local/bin", "/u/l/bin"),
            ("/", "/"), ("/tmp", "/tmp"),
        ):
            with self.subTest(path=path):
                self.assertEqual(notify.short_path(path), expected)

    def test_subagents_and_unrelated_events_never_notify(self):
        for event, depth in (
            ({"hook_event_name": "Stop"}, "1"),
            ({"hook_event_name": "Stop"}, "2"),
            ({"hook_event_name": "Stop"}, "invalid"),
            ({"hook_event_name": "Stop", "agent_id": "child"}, None),
            ({"hook_event_name": "Notification", "agent_id": "child"}, None),
            ({"hook_event_name": "Notification", "notification_type": "agent_completed"}, None),
            ({"hook_event_name": "SubagentStop"}, None),
            ([], None),
        ):
            with self.subTest(event=event, depth=depth):
                self.assertEqual(self.invoke(event, depth=depth).call_count, 0)

    def test_notifications_never_deliver(self):
        for provider in ("pi", "claude", "codex"):
            for reason in (None, "idle_prompt", "permission_prompt", "agent_completed"):
                for message in (None, "Input needed", "x" * 3000):
                    with self.subTest(provider=provider, reason=reason, message_length=len(message or "")):
                        run = self.invoke({"hook_event_name": "Notification", "cwd": "/tmp/a b",
                                           "agent_type": "reviewer", "notification_type": reason,
                                           "message": message}, provider, depth="0",
                                          argv_payload=provider == "pi")
                        self.assertEqual(run.call_count, 0)

    def test_missing_message_and_bounded_message(self):
        for provider in ("pi", "claude", "codex"):
            with self.subTest(provider=provider):
                run = self.invoke({"hook_event_name": "Stop", "cwd": "/tmp/project"}, provider)
                self.assertEqual(run.call_args.args[0][-1], "작업 완료: project")
                run = self.invoke({"hook_event_name": "Stop", "last_assistant_message": "x" * 3000},
                                  provider)
                self.assertEqual(len(run.call_args.args[0][-1]), 2000)

    def test_delivery_failure_is_nonblocking(self):
        with patch.object(notify.subprocess, "run", side_effect=OSError):
            with patch.object(sys, "argv", ["agent-notify.py", "pi", '{"hook_event_name":"Stop"}']):
                notify.main()


if __name__ == "__main__":
    unittest.main()
