## Problem

We run a self-hosted Cumora v0.18.6 Docker pilot and use the official iOS app with its API Server setting pointed at our own HTTPS origin. GitHub OAuth login works after configuring the native return URL and CORS. BYOA Codex is paired on the self-hosted server and chat works.

We would like background/lock-screen notifications without maintaining a separately signed iOS fork. PUSH_NOTIFICATIONS.md describes configuring APNs credentials for the app's bundle ID, while server/src/push.ts sends directly to Apple. A self-host operator's own Apple Developer credentials would not normally authorize push delivery for the official app's bundle ID.

## Questions / requested support

1. Is push from a self-hosted backend to the official iOS app currently supported? If so, could you document the supported setup and credential ownership requirements?
2. If not, would you consider an opt-in official push relay, or another supported mechanism that does not require distributing your APNs signing key to self-host operators?
3. Please document the support matrix for official app + self-hosted backend versus a separately signed app, including device registration, background delivery, and notification tap routing back to the selected server/workspace.
4. Please distinguish chat-message push support from calendar-reminder push support; the current docs list calendar/doc-mention push as follow-up work.

For a relay, opaque device registration, tenant authorization, rate limiting, minimal notification content, and revocation would help preserve the self-hosted trust boundary. These are design considerations, not a request to expose official signing credentials.

## Related client observation (not yet established as the same cause)

After signing in to the self-hosted server, the iOS push status panel displays unknown permission/no device token and the localized message corresponding to `push.stepLoadPlugin` (“加载 @capacitor/push-notifications 插件卡住”). We do not yet have native logs or the exact installed iOS app build, so we cannot conclude this is caused by missing server APNs credentials or a missing native plugin.

The docs explicitly say device registration should still work without server APNs credentials, with sending disabled. Could you clarify the recommended diagnostics for this state in the distributed iOS app? The `load-plugin` status text alone does not distinguish a pending import from a failed initialization.

## Acceptance criteria

- A documented supported path (or an explicit current limitation) for official iOS app + self-hosted push.
- If implemented: background/locked-device delivery for a self-hosted chat message and correct tap navigation to that server/workspace, with no credential sharing outside the intended trust boundary.
- Clear client diagnostics separating plugin loading, OS permission, device registration, and server push availability.

References: [push setup](https://github.com/yetone/cumora/blob/v0.18.6/docs/PUSH_NOTIFICATIONS.md), [iOS build documentation](https://github.com/yetone/cumora/blob/v0.18.6/docs/MOBILE_IOS.md), [client initialization](https://github.com/yetone/cumora/blob/v0.18.6/src/lib/push.ts).
