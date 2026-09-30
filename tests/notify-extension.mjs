import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { root, sdkDir } from "./support.mjs";

const require = createRequire(join(sdkDir, "package.json"));
const { createJiti } = require("jiti");
const jiti = createJiti(import.meta.url);
const extension = await jiti.import(join(root, "agent/extensions/notify.ts"), {
  default: true,
});
const originalDepth = process.env.PI_SUBAGENT_DEPTH;
try {
  delete process.env.PI_SUBAGENT_DEPTH;
  const handlers = new Map();
  const calls = [];
  extension({
    on: (name, handler) => handlers.set(name, handler),
    exec: async (...args) => calls.push(args),
  });
  assert.deepEqual(
    [...handlers.keys()],
    ["agent_settled"],
    "Notify only after retries and queued continuations settle",
  );
  const entries = [
    {
      type: "message",
      message: { role: "assistant", content: [{ type: "text", text: "old" }] },
    },
    {
      type: "message",
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "private" },
          { type: "text", text: "검증 완료" },
        ],
      },
    },
  ];
  const ctx = {
    cwd: "/tmp/project",
    sessionManager: { getBranch: () => entries },
  };
  await handlers.get("agent_settled")({}, ctx);
  assert.equal(calls[0][0], "python3");
  assert.deepEqual(JSON.parse(calls[0][1][2]), {
    hook_event_name: "Stop",
    cwd: ctx.cwd,
    last_assistant_message: "검증 완료",
  });
  for (const depth of ["1", "2", "invalid"]) {
    process.env.PI_SUBAGENT_DEPTH = depth;
    extension({
      on: () =>
        assert.fail("Subagents must not register notification handlers"),
    });
  }
  console.log(
    "Pi notification extension: root settlement and subagent exclusion passed",
  );
} finally {
  if (originalDepth === undefined) delete process.env.PI_SUBAGENT_DEPTH;
  else process.env.PI_SUBAGENT_DEPTH = originalDepth;
}
