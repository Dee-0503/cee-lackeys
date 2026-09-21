# iOS 自托管访问配置

用户授权后更新 `/home/cee/apps/cumora-pilot/runtime.env`：

```dotenv
CUMORA_AUTH_RETURN_ALLOWLIST=https://lackeys.ceee.cloud/,cumora://auth
CUMORA_CORS_ORIGINS=capacitor://localhost
```

只重建 server，固定镜像不变，DB/Redis/BYOA 配置未改。旧配置保存为 `runtime.env.before-ios`。

验证：iOS Origin 预检 204，精确返回 Access-Control-Allow-Origin；未知 Origin 无 CORS 许可头；cumora://auth OAuth 发起返回 302 到 github.com；未知返回地址拒绝 400；health 200，server healthy，BYOA systemd active。未输出 OAuth state 或密钥。

原生 CapacitorHttp 在官方源码中默认启用，可绕过 WebView fetch CORS，因此不能断言所有 iOS 构建原先都因 CORS 失败；此次补齐精确来源用于 WebView 请求兼容。原生 OAuth return 白名单是必要配置。

人工步骤：官方 App 退出登录 → 登录页 API Server → 自定义 https://lackeys.ceee.cloud → 使用 → GitHub 登录。GitHub OAuth App HTTPS callback 保持不变。实际 iOS 登录/回跳尚待用户确认；不需要重新配对计算机。

回滚：将 runtime.env.before-ios 恢复为 runtime.env，再在同一 compose 项目执行 `up -d --no-deps --wait server`。没有修改 DNS/Nginx、Wiki、TREK、通知渠道或 Agent 配置。完整 pilot 验收仍待完成。
