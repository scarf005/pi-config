# CI watch

Personal Pi extension using
[smee-client](https://github.com/probot/smee-client).

```text
GitHub workflow_run webhook → smee SSE → authoritative gh api lookup
→ compact state-change message → Pi follow-up turn
```

Reload Pi with `/reload`, then use `/ci-watch <run-id>` or the `ci_watch` tool.
`/ci-watch status` reads cached state; `/ci-watch stop <run-id>` unsubscribes.
Completed runs stop automatically. No idle GitHub polling or automatic
failed-log fetching. Watches persist in the session and reconcile on
reload/reconnect.

Configuration: `$XDG_STATE_HOME/pi-ci-watch/config.json` (default
`~/.local/state/pi-ci-watch/config.json`), mode 0600:

```json
{ "repository": "owner/public-repo", "source": "https://smee.io/CHANNEL" }
```

Configure a GitHub webhook for `workflow_run` only, JSON content type, SSL
verification enabled. The installed configuration is scoped to the personal BN
fork. Private repositories must not use the public relay without explicit
consent. Treat the channel URL as sensitive; do not commit or log it.

Relay payloads are untrusted hints. Only tracked run IDs cause a GitHub read;
their payloads never enter model context. GitHub state is read through the local
`gh` authentication. Bursts coalesce with at most one read per run per 30
seconds. Smee reserializes JSON, so the adapter does not claim to authenticate
the original GitHub signature. It trusts GitHub API responses, not
relay-supplied outcomes.

GitHub lookup failures stop that watch and wake the agent with an
unknown-outcome warning. Restart explicitly after resolving authentication or
rate limits. Network errors reconnect SSE and reconcile state, but smee has no
durable event history; intermediate transitions during downtime may be missed.
This requires a running Pi process; it does not launch a stopped session. Events
do not authorize mutations.

## Development

Node 25+ is used for native TypeScript tests. Pi provides its API and `typebox`;
install runtime dependencies with
`npm install --ignore-scripts --legacy-peer-deps`. Resolve the host-provided
packages locally for standalone TypeScript checking.

```sh
npm test
npm run check
npm run format
```
