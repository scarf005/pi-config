import {
  applyContractVerdict,
  buildReviewInput,
  canMutate,
  createTaskState,
  injectContractContext,
  isGitCommitCommand,
  recordRequest,
  type TaskContract,
} from "../agent/extensions/task-contract/policy.ts"
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert"

const contract: TaskContract = {
  goal: "preserve the requested public call form",
  externallyVisibleBehavior: ["call(arg) remains directly visible at the requested call site"],
  explicitConstraints: ["do not introduce an adapter"],
  scope: ["src/caller.ts", "the underlying capability needed by that call"],
  implementationFacts: ["the current parser accepts identifiers only"],
  unresolvedDecisions: [],
}

Deno.test("a validated clear contract opens mutation without clarification", () => {
  const pending = createTaskState("Use call(arg) directly and extend the implementation if needed")
  const ready = applyContractVerdict(pending, contract, { pass: true, violations: [], materialDecisions: [] })

  assertEquals(ready.phase, "ready")
  assertEquals(ready.contract, contract)
  assertEquals(ready.clarification, [])
  assert(canMutate(ready))
})

Deno.test("material unresolved decisions block mutation until the user resolves them", () => {
  const pending = createTaskState("Expose timestamps in the public JSON response")
  const proposed: TaskContract = {
    ...contract,
    goal: "expose timestamps",
    externallyVisibleBehavior: ["the public timestamp representation changes"],
    unresolvedDecisions: [{ question: "Use ISO strings or Unix seconds?", impact: "changes the public JSON schema" }],
  }
  const blocked = applyContractVerdict(pending, proposed, {
    pass: true,
    violations: [],
    materialDecisions: proposed.unresolvedDecisions,
  })

  assertEquals(blocked.phase, "blocked")
  assertEquals(blocked.clarification, proposed.unresolvedDecisions)
  assert(!canMutate(blocked))
})

Deno.test("internal implementation freedom is not promoted to a user question", () => {
  const pending = createTaskState("Cache repeated reads without changing the API")
  const proposed: TaskContract = {
    ...contract,
    goal: "cache repeated reads",
    externallyVisibleBehavior: ["the existing API returns the same values with fewer reads"],
    unresolvedDecisions: [{ question: "Use Map or an object?", impact: "internal storage only" }],
  }
  const rejected = applyContractVerdict(pending, proposed, {
    pass: false,
    violations: ["Map versus object is an internal implementation choice and must not trigger clarification"],
    materialDecisions: [],
  })

  assertEquals(rejected.phase, "pending")
  assert(!canMutate(rejected))
  assertStringIncludes(rejected.validationViolations[0], "internal implementation choice")
})

Deno.test("a new user request invalidates the previous contract and review", () => {
  const ready = applyContractVerdict(createTaskState("Implement A"), contract, {
    pass: true,
    violations: [],
    materialDecisions: [],
  })
  const amended = recordRequest(
    { ...ready, review: { pass: true, violations: [], snapshotHash: "abc" } },
    "Also update B",
  )

  assertEquals(amended.phase, "pending")
  assertEquals(amended.review, undefined)
  assertEquals(amended.requests.map(({ text }) => text), ["Implement A", "Also update B"])
})

Deno.test("the current contract survives long context and replaces stale capsules", () => {
  const ready = applyContractVerdict(createTaskState("Implement A exactly"), contract, {
    pass: true,
    violations: [],
    materialDecisions: [],
  })
  const longContext = [
    { role: "compactionSummary", summary: "lossy old summary", tokensBefore: 100_000, timestamp: 1 },
    ...Array.from({ length: 100 }, (_, index) => ({
      role: "custom",
      customType: index % 10 === 0 ? "task-contract-capsule" : "noise",
      content: `message ${index}`,
      display: false,
      timestamp: index + 2,
    })),
  ]
  const injected = injectContractContext(longContext, ready)
  const capsules = injected.filter((message) =>
    message.role === "custom" && "customType" in message && message.customType === "task-contract-capsule"
  )

  assertEquals(capsules.length, 1)
  assertStringIncludes(JSON.stringify(capsules[0]), "call(arg) remains directly visible")
  assertStringIncludes(JSON.stringify(capsules[0]), "Implement A exactly")
})

Deno.test("review input contains only request, contract, and final diff", () => {
  const ready = applyContractVerdict(createTaskState("Keep POST /users/:id exactly"), contract, {
    pass: true,
    violations: [],
    materialDecisions: [],
  })
  const input = buildReviewInput(ready, "diff --git a/router.ts b/router.ts\n+router.post('/users/:id')")

  assertStringIncludes(input, "Keep POST /users/:id exactly")
  assertStringIncludes(input, '"goal": "preserve the requested public call form"')
  assertStringIncludes(input, "diff --git")
  assert(!input.includes("implementation transcript"))
  assert(!input.includes("tool result"))
})

Deno.test("git commit boundary detection handles normal and global-option forms", () => {
  assert(isGitCommitCommand("git commit -m 'fix: preserve contract'"))
  assert(isGitCommitCommand("git -C /tmp/project commit --amend"))
  assert(isGitCommitCommand("git status && git commit -m fix"))
  assert(!isGitCommitCommand("git status --short"))
  assert(!isGitCommitCommand("printf 'git commit'"))
})
