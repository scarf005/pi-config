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
                self.assertEqual(args[-1], "검증 완료: $(never-run)")

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

    def test_named_root_and_waiting_notification(self):
        run = self.invoke({"hook_event_name": "Notification", "agent_type": "reviewer",
                           "message": "권한 확인 필요"}, depth="0")
        self.assertEqual(run.call_args.args[0][-2:], ["Claude Code: 입력 대기 중", "권한 확인 필요"])

    def test_missing_message_and_bounded_message(self):
        run = self.invoke({"hook_event_name": "Stop", "cwd": "/tmp/project"})
        self.assertEqual(run.call_args.args[0][-1], "작업 완료: project")
        run = self.invoke({"hook_event_name": "Stop", "last_assistant_message": "x" * 3000})
        self.assertEqual(len(run.call_args.args[0][-1]), 2000)

    def test_delivery_failure_is_nonblocking(self):
        with patch.object(notify.subprocess, "run", side_effect=OSError):
            with patch.object(sys, "argv", ["agent-notify.py", "pi", '{"hook_event_name":"Stop"}']):
                notify.main()


if __name__ == "__main__":
    unittest.main()
