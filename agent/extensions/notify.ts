import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  if ((process.env.PI_SUBAGENT_DEPTH ?? "0") !== "0") return;

  pi.on("agent_settled", async (_event, ctx) => {
    const lastAssistant = ctx.sessionManager.getBranch().findLast(
      (entry) => entry.type === "message" && entry.message.role === "assistant",
    );
    const message = lastAssistant?.type === "message" &&
        lastAssistant.message.role === "assistant"
      ? lastAssistant.message.content.filter((block) => block.type === "text")
        .map((block) => block.text).join("\n")
      : "";
    await pi.exec("python3", [
      join(homedir(), ".config/pi/bin/agent-notify.py"),
      "pi",
      JSON.stringify({
        hook_event_name: "Stop",
        cwd: ctx.cwd,
        last_assistant_message: message,
      }),
    ], { timeout: 10000 });
  });
}
