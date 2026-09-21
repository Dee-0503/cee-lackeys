# 公网灰云直连

## Observed

2026-09-20 用户明确授权公网直连，并要求不启用 Cloudflare 橙云。

- `lackeys.ceee.cloud` A → `64.90.11.148`，proxied=false，TTL 120。
- DNS record ID：`7fba41257a665c098230be5d4e449200`，此前该名称无记录。
- Let's Encrypt 证书签发成功，到期日 2026-12-19，目录 `/etc/letsencrypt/live/lackeys.ceee.cloud/`。
- Nginx 配置测试通过并 reload；HTTP 返回 301 到 HTTPS。
- 从本机直接请求 HTTPS：remote_ip=64.90.11.148、ssl_verify_result=0、HTTP 502。
- 502 原因为 Cumora upstream 127.0.0.1:15181 尚未启动；不能把域名配置完成报告为应用 healthy。
- 80/443 是已有 Nginx 监听；UFW 原先 inactive，本次未修改防火墙或增加监听端口。

## Inferred

DNS/HTTPS 直连入口已就绪，绕过 Cloudflare HTTP 代理；大陆实际访问延迟需用户网络实测。没有 Access 邮箱白名单，先前提供的邮箱并未成为访问限制。应用登录将依赖 Cumora GitHub OAuth；OAuth 不自动等同于仅允许某个邮箱注册。

## Unknown

模型与 OAuth 配置、migration、server 启动、认证 smoke、中文 UI、BYOA 和人工验收仍待完成。证书自动续期定时机制由现有 Certbot 管理，未执行续期 dry-run。

## Changed

- 新建上述 Cloudflare DNS record（DNS only）。
- 新建 `/etc/nginx/sites-available/lackeys.ceee.cloud.conf` 及对应 sites-enabled 软链接。
- 新建项目内 `nginx-http.conf`、`nginx.conf`、`acme/`；pilot 根目录增加其他用户 traverse 权限供 Nginx ACME 校验使用，secrets 子目录权限不变。
- 新建该域名证书 lineage/renewal 配置及 Nginx pilot 专用 access/error 日志。
- 项目专用证书 deploy hook 仅在该 lineage 续期时 nginx -t 后 reload。
- 本地新增本报告及对应配置文件，未提交 Git。

## Not changed

未创建 Cloudflare Access/Tunnel，未启用橙云；未改其他 DNS/站点配置、UFW、cee-wiki、TREK、cc-switch、Agent 配置、Obsidian、claude-mem、本地证据 MCP、qmd、通知渠道。没有把 DB/Redis 或 15181 暴露公网。

## Human acceptance

地址为 https://lackeys.ceee.cloud ，目前预期 502，不能验收应用。模型和 OAuth 配置完成、server 启动后，再人工测试 GitHub 登录、中文 UI、Agent、日历提醒及重启恢复。

## Rollback

应用停止命令仍为 `sudo docker compose -p cumora-pilot -f /home/cee/apps/cumora-pilot/compose.yaml stop`。

若撤销公网入口：先确认 DNS record ID 仍属于本次 A 记录，再删除该精确记录；将本项目 sites-enabled 软链接移到项目备份目录，nginx -t 后 reload。保留证书、sites-available 配置和日志便于恢复，不删除其他项目证书或执行全局清理。

## Adoption recommendation

`pilot-needs-fix`。域名 configured，镜像 built；仅 PostgreSQL/Redis running/healthy；Cumora server 未运行。manually-verified、pilot-passed、adopted 均否。
