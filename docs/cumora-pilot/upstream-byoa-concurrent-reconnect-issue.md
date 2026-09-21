## Summary

In a self-hosted Cumora v0.18.6 pilot using a paired BYOA Codex 0.155.1 daemon, a large all-hands task woke many agents at once. During the resulting queue/reconnect window, one agent surfaced a misleading local-engine failure and the run was reported as `exit 128` / `SIGTERM`:

```text
local codex failed (exit 128): process terminated by SIGTERM
ERROR: Reconnecting... 1/5
bwrap: execvp /home/cee/apps/codex-pilot/releases/0.155.1/codex-x86_64-unknown-linux-musl: No such file or directory
```

The binary existed and was executable when checked. After the daemon was restarted, the same agent and all peers reconnected and subsequent turns completed successfully. This does not appear to be an auth or quota failure.

## Environment

- Cumora: v0.18.6, self-hosted Docker pilot
- BYOA: paired Codex computer daemon on Linux, systemd service
- Engine: Codex 0.155.1, custom Responses provider, default secure workspace-write sandbox
- Agents: 9 BYOA Codex agents in one workspace
- Trigger conversation: all-hands group; identifiers and user data omitted here

## Reproduction shape

1. Send one concrete task to a large group containing all 9 agents.
2. Each agent receives the same SSE wake and begins triage / big-brain scheduling.
3. Queue depth reached `7 including self` and later `6 including self` in the daemon log.
4. While agents were starting or reconnecting, one persistent Codex session failed and fallback/reconnect printed the bwrap `execvp ... No such file` message.
5. The run ended as exit 128 / SIGTERM. The daemon then shut down and restarted as part of an operator-authorized configuration repair; reconnect-catchup woke several agents again.
6. After restart, all agents reported `wake-stream connected`; later Mira turns completed with exit 0.

The large group task itself was intentionally broadcast to every agent, so the issue is not claiming that every wake was unsolicited. The question is how the BYOA runtime classifies and contains this failure during a high-concurrency/reconnect window.

## Observed timeline (UTC, sanitized)

- 01:09:14: queue depth 7 including self; Atlas turn completes while another engine error is logged.
- 01:09:34: bwrap reports `execvp ... codex-x86_64-unknown-linux-musl: No such file or directory`.
- 01:11:29: queue depth 6 including self; Mira starts a fresh persistent session.
- 01:11:29: Codex rejects a stale unsupported local config key (`disable_response_storage`); this key was removed afterward and is a separate configuration bug.
- 01:12:25: Mira reports `Reconnecting... 1/5`.
- 01:12:30: the same bwrap `execvp` message appears.
- 01:13:43–01:14:01: the daemon receives SIGTERM and all agents are hosted/reconnected. This restart was operator-authorized during config repair, not claimed as an autonomous crash.
- 01:15:05–01:15:42: reconnect-catchup starts several all-hands turns, with triage latency growing to roughly 65–101 seconds.
- 01:16:34–01:16:59: a second operator-authorized daemon restart occurs while catch-up turns are still active; all agents reconnect afterward.
- 01:36:36 onward: Mira completes repeated turns with exit 0.

## Questions / requested support

1. Can the BYOA runtime distinguish a child engine start failure, an operator daemon SIGTERM, a reconnect timeout, and a genuine provider/auth/quota failure in the user-facing notice? The current generic “Open Codex and refresh login or quota” message was misleading here.
2. Why can the bwrap child report `execvp ... No such file` when the configured Codex binary exists and is executable on the host? Is there a race around daemon restart, bwrap namespace construction, or an old runner retaining stale executable state?
3. During reconnect-catchup, can the daemon coalesce or cap catch-up wakes for the same all-hands conversation? A single broadcast produced queue depth 7/6 and multiple agents were reawakened after restart.
4. Can an interrupted run be marked as interrupted/retryable with an explicit reason, rather than a generic failed run / stale-run cleanup path?
5. Can triage / reconnect work honor a global concurrency and shutdown deadline without leaving many `running/created` rows that are later closed by the stale-run sweeper?

## Expected behavior

- Keep the original run and conversation wake idempotent across reconnect and daemon restart.
- Report engine start failure, provider failure, quota/auth failure, and operator shutdown separately.
- Avoid re-running the same all-hands task for every agent after a reconnect unless the message remains unacknowledged and the agent is an intended owner.
- Preserve the current safe sandbox and do not fall back to unsandboxed execution to make the error disappear.

## Evidence / privacy

The full journal and database extracts were reviewed locally and are intentionally not attached because they include private conversation text, filesystem paths, host identifiers, and agent timing. The excerpts above contain no credentials, tokens, task content, or personal addresses. The pilot recovered and subsequent runs completed successfully.
