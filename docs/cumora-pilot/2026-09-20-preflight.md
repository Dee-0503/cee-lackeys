# Cumora Docker pilot：预检与配置预览

> 本文件是首次预检时点的记录。用户随后授权先准备部署再配置；后续构建结果及实际变更见 [构建报告](2026-09-20-build.md)。

## Observed

核验时间：2026-09-20 02:15:55 Asia/Shanghai（服务器 UTC：2026-09-19T18:15:55Z）。本次没有部署时间：尚未部署。

- SSH 别名：`cee-server`；实际主机名：`ser071278902695`；Ubuntu 22.04 LTS。
- 操作者：`cee`，UID 1001 / GID 1002；Docker 29.7.2；Compose v5.5.0。
- `/home/cee` 为 `0751`、`cee:cee`；`/home/cee/apps` 为 `0755`、`cee:cee`；`/home/cee/backups` 为 `0775`、`cee:cee`。
- `/home/cee/data` 尚不存在。以下所有 pilot 目录均不存在，未创建：
  - `/home/cee/apps/cumora-pilot/`
  - `/home/cee/data/cumora-pilot/postgres/`
  - `/home/cee/data/cumora-pilot/redis/`
  - `/home/cee/data/cumora-pilot/uploads/`
  - `/home/cee/data/cumora-pilot/logs/`
  - `/home/cee/backups/cumora-pilot/`
- `cumora-pilot` 用户不存在；UID/GID 10001 查询无结果，尚未分配。
- TCP 15181 在核验时没有监听；未绑定端口。`/home/cee` 所在磁盘约 91G 可用。
- 未枚举其他项目容器，未读取其他项目配置或密钥。

### 固定源码

官方来源：<https://github.com/yetone/cumora>，由仓库元数据和根 package.json 的 repository 字段交叉核对。

| 项目 | 直接核验结果 |
| --- | --- |
| tag | `v0.18.5`，存在，为 annotated tag |
| tag object | `c871faa062fdb6241541c2dc7523cda0697fe7e3` |
| tag 指向 commit | `324159d643bacc8cd271dbf2491da2b58046c8b1` |
| 用户输入 commit | `324159d643bacc8cd271dbf2491da2b58046c8b`，是上述完整 SHA 的前缀，少末尾 `1` |
| tag 签名 | GitHub 返回 unsigned，未声称签名已验证 |
| package.json / lock 根版本 | 均为 `0.18.5`，lockfileVersion 3 |
| server/package.json | 不存在；后端使用仓库根 package.json 和 package-lock.json |
| 官方 Dockerfile | `server/docker/cumora-server.Dockerfile`，存在，未修改 |
| Docker ignore | `server/docker/cumora-server.Dockerfile.dockerignore`，存在 |
| 中文 | `docs/I18N.md` 明确 zh-CN；`src/locales/zh-CN.ts` 存在 |
| 本地核验副本 | `/tmp/cumora-pilot-audit.A7M06X/source`，detached HEAD，源码工作树干净 |
| 源码 SHA-256 | `d70bd9e79f45a9e3f578784559c0b964cdf37c9bf63061fb0d57c9b9d5611570` |
| 哈希口径 | 在核验副本运行 `git archive --format=tar HEAD \| shasum -a 256`，流式计算，未保存 tar 文件 |
| image ID / digest | 不存在：未构建、未拉取 pilot 镜像 |

Dockerfile 的所有本地 COPY 来源均存在：根 package 文件、src、public、index.html、vite/tsconfig/postcss/tailwind 配置、server、bin。静态上下文检查通过，不代表 Docker build 成功。

### 构建、运行与功能入口

- 官方构建：仓库根作为 context，`docker build -f server/docker/cumora-server.Dockerfile ... .`。
- 多阶段构建：Node 20 runtime deps、Node 20 SPA build、Debian kubectl build、Node 20 runtime；使用 `npm ci` 和根 lock，SPA 使用 `npm run build`。
- 构建需访问镜像 registry、npm、Debian apt、dl.k8s.io。官方 `node:20-bookworm-slim` / `debian:bookworm-slim` 未锁 digest；kubectl 取 `stable.txt`。源码固定不等于所有构建输入固定。
- 未发现单机 Compose 文件；现有 Kubernetes 清单不可直接当成本试点配置。
- migration：`npm run migrate` → `server/src/migrate-bin.ts` → `ensureSchema()`；有 advisory lock 和 schema_migrations 账本。应用启动只核验 schema，必须先完成 migration。
- Postgres：pg + drizzle；schema 位于 `server/src/db/schema.ts`，migration 在 `server/src/db/migrate.ts` 和 `server/src/db/migrations/`。`pg_trgm` 被 migration 使用；pgvector 不可用时源码允许语义记忆降级。
- Redis：ioredis，承载 pub/sub、claim/去重等；不能只按可丢弃缓存处理。
- server：`npm run server:start`；默认端口 5181；同源托管 SPA、`/api/*`、`/runtime/*`。
- 健康接口：`/api/livez` 只验证进程响应；`/api/health` 检查 Postgres（1 秒超时），不证明 Redis、认证或 Agent 可用。
- 本地附件目录：`/app/server/uploads`；未配置完整 R2 变量时使用本地存储。
- 必需凭据：`OPENAI_API_KEY`；`NODE_ENV=production` 还要求 `AGENT_RUNTIME_SECRET` 不为源码开发默认值。migration 的 pool 也导入 env，不能假设 migration 不需要这些变量。
- 登录：`/api/auth/providers`、`/api/auth/start/:provider`、`/api/auth/callback/:provider`；已核验 Web OAuth 路径。种子用户无密码、无 OAuth identity，不可登录；seed 文件下部的旧密码注释不能作为有效登录方式。
- BYOA：`docs/BYOA.md`、`server/src/agents/computer/engine.ts`，入口 `cumora agent computer`。需要另行配对 daemon、engine、provider 授权及隔离工作目录。没有安装或运行它。
- managed Agent 依赖 Kubernetes agent-computer Pod；仅 server/Postgres/Redis Compose 不足以验证 managed Agent。
- 桌面语言入口：Preferences → Language；移动入口：You → Language。源码存在不等于人工验收通过。

## Inferred

单机容器可以成为后端与 SPA 的试验载体，但当前不能据此认定是完整 Agent 宿主方案，更不是官方 GKE 发布链的完整替代。

当前有两个启动阻塞：

1. 配置缺失：本会话没有已批准的安全凭据注入来源，不能获得必需 provider/runtime secret，也没有确定可用的 OAuth 配置。没有搜索或借用 TREK/其他项目密钥。
2. 严格禁提醒与未修改源码冲突：`server/src/index.ts` 无条件调用 `startCalendarScheduler()`；`server/src/calendar.ts` 在 5 秒后首次 tick，之后每分钟调度，未发现环境变量关闭入口。空 calendar 表只能令其暂时不触发，不能声称“提醒未启用”。

因此按用户“配置缺失时停止”要求，没有进入构建和启动阶段，也没有用测试字符串、开发默认 secret、源码补丁或运行时注入绕过。

## Unknown

- 已批准的 secret provider/挂载来源及其授权；真实变量值未读取。
- OAuth provider 选择、专用应用、localhost callback 支持及用户能否完成授权。
- 模型 endpoint、主模型/辅助模型权限与费用；中文回复能力。
- 无源码改动时如何严格关闭日历提醒。
- PostgreSQL/Redis 的最终固定版本和 digest、数据目录 UID/GID；尚未选择或拉取未经核验的第三方镜像。
- 官方构建能否完成；最终 image ID/digest、kubectl 版本、基础镜像 digest。
- BYOA engine 授权、安装与运行兼容性；managed Kubernetes 环境未确认，未部署。
- 人工桌面/移动 UI、注册登录、数据恢复、任务不重复、备份恢复均未验证。

## 阶段 B 配置预览（未生成 Compose、未实施）

| 项目 | 拟定方案 / 尚待核验 |
| --- | --- |
| 项目 | Compose project `cumora-pilot`，文件 `/home/cee/apps/cumora-pilot/compose.yaml` |
| 服务 | `server`、`postgres`、`redis`、一次性 `migration` |
| 服务用户 | 拟创建无登录、无 sudo/docker 组权限的 `cumora-pilot` 系统用户；候选 UID/GID 10001，创建前重新核验；cee 仅部署操作者 |
| server/migration 权限 | 使用专用非 root UID/GID；实际镜像文件可读性需构建后验证 |
| Postgres/Redis 权限 | 使用最终镜像的非 root 服务 UID/GID；仅赋予各自数据目录权限，不统一 chown 全部数据 |
| 网络 | 独立内部 bridge `cumora-pilot-backend`；DB/Redis 无宿主机 ports；server 如需 provider/OAuth 出站，另用仅 server 加入的专用 bridge |
| 暴露 | 唯一拟定映射 `127.0.0.1:15181:5181`；不挂 Docker socket/kubeconfig/其他项目目录 |
| 访问 | 现有 SSH 密钥通道；拟使用 `ssh -N -L 127.0.0.1:15181:127.0.0.1:15181 cee-server`；浏览器 `http://127.0.0.1:15181/`，目前不可访问 |
| 数据挂载 | postgres → 最终镜像 PGDATA（需按大版本确认）；redis → `/data`；uploads → `/app/server/uploads`；来源为各自 pilot 专用目录 |
| 日志 | 容器 stdout/stderr 使用 local driver 并限制大小/轮转；备份时可脱敏导出到 pilot logs，不假设 Cumora 支持文件日志路径变量 |
| 普通环境变量 | NODE_ENV、PORT、INSTANCE_ID、REDIS_URL、OPENAI_MODEL、OPENAI_MODEL_SUPPORT、CUMORA_PUBLIC_ORIGIN、CUMORA_AUTH_DONE_URL、CUMORA_AUTH_RETURN_ALLOWLIST、PUBLIC_HOST |
| 机密变量名 | OPENAI_API_KEY、AGENT_RUNTIME_SECRET、DATABASE_URL、Postgres 密码；按选定 OAuth provider 加入 GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET 或 GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET 或 GITLAB_CLIENT_ID/GITLAB_CLIENT_SECRET |
| secret 引用 | 拟由用户批准的外部秘密管理方式只读挂载 `/run/secrets/...`；源码只读 env，需独立启动 wrapper 在进程内加载，禁 set -x/打印；不是已实现的 `_FILE` 支持，不写 compose 明文 secret |
| 禁用项 | ENABLE_SCANNER=false、ENABLE_IDLE=false、IDLE_INTERVAL_MS=0、ENABLE_AGENT_POD_GC=false、ENABLE_CHROME_PVC_GC=false、ENABLE_CLUSTER_MONITOR=false、EMAIL_RETRY_INTERVAL_MS=0；不配置通知、R2、技能 hub、provider 外的无关集成凭据 |
| 提醒 | 日历无已核验关闭开关，阻塞启动；不得编造 `ENABLE_CALENDAR=false` |
| migration | 同一固定 image 执行 `npm run migrate`，退出 0 后才可启动 server；restart=no |
| healthcheck | Postgres pg_isready；Redis PING；server Node fetch `/api/health`，另验 `/api/livez`、Redis 与认证 smoke |
| restart | 长驻服务 unless-stopped；migration no；Docker unhealthy 本身不等于自动重启 |
| 备份 | `/home/cee/backups/cumora-pilot/`，0700；操作者通过受控 sudo 操作；不使用 TREK 备份目录 |
| 版本记录 | Compose 内容/hash、源码 tar/hash、构建 UTC 时间、基础镜像 digest、最终 image ID/RepoDigests、image save archive SHA-256；本地构建 RepoDigests 可能为空，必须如实记录 |
| 回滚 | 保留旧镜像与备份；停止 server 后回退固定 image；涉及 schema 时恢复匹配 DB，不能只改 image 假设兼容 |

## Changed

- 本地新增本报告：`docs/cumora-pilot/2026-09-20-preflight.md`。
- 创建临时核验目录 `/tmp/cumora-pilot-audit.A7M06X/`，克隆其 `source/` 子目录，未修改 Cumora 源码。
- 服务器没有创建/修改路径、用户、镜像、容器、网络或端口。没有生成真实密钥。
- 原有 `.serena/` 未跟踪内容保留；没有提交 Git。

## Not changed

cee-wiki（含 canonical 与 Wiki core）、TREK、cc-switch、Agent 配置、Obsidian、claude-mem、本地文件证据 MCP、qmd、DNS/Nginx/Cloudflare、Telegram/Discord/ntfy/邮件及其他通知渠道：全部未改动、未接入。

## Human acceptance

全部待执行；自动检测不能替代以下人工记录。当前没有可用服务页面。

1. 启动获准并完成后，建立上述 SSH tunnel，人工打开 `http://127.0.0.1:15181/`。
2. 登录页选择已配置 OAuth provider，首次授权验证注册、退出后重新登录；验证 `/api/auth/providers` 和回调路径，不使用种子密码或伪造 session。
3. Preferences → Language 中确认“简体中文”并切换，刷新后确认保留。
4. 检查桌面主要页面与窄屏/移动 UI；移动入口 You → Language。真实手机需要另行确定受控访问方式，不能开放公网端口代替。
5. 新建合成测试 Agent，记录 Agent ID、Computer/engine 选择；未获 engine 授权时标为 blocked。
6. 新建测试对话，发送唯一中文标记，记录对话和消息 ID。
7. 确认真实 Agent 返回中文，记录模型/engine、时间与失败原因，不能将 UI 翻译当作中文回复。
8. 经单独授权后验证 BYOA 配对、在线状态、engine 调用、重连；未安装 CLI 不记为核心后端部署失败。
9. 比对重启前后 Agent、对话、消息和附件的 ID/数量/内容；浏览器本地语言偏好与数据库状态分别记录。
10. 停止/启动后检查合成任务和消息是否重复，覆盖未完成任务恢复；本阶段不创建提醒任务。
11. 生成 Postgres、Redis、uploads、配置和固定镜像备份，记录校验和与访问权限。
12. 使用单独恢复项目和全新空目录完成恢复，验证登录、合成对话、附件；不得覆盖原 pilot 或挂载其他项目数据。
13. 实际演练停止与恢复；记录执行人、时间、结果和阻塞。未完成不得标记 manually-verified/pilot-passed。

## Rollback

当前无服务器变更，无需停止或恢复任何服务。以下为将来 Compose 确实生成并核验后的操作模板，当前不要执行。

停止整个 pilot（保留数据）：

```sh
ssh cee-server 'sudo docker compose -p cumora-pilot -f /home/cee/apps/cumora-pilot/compose.yaml stop'
```

正常重启 server：同一项目/文件作用域执行 `restart server`；停后启动使用 `start postgres redis server`，仅适用于容器已创建且 migration 已成功。新部署必须先健康 DB/Redis、再一次性 migration，最后 server。

备份方案：

- 暂停 server 写入和所有 pilot agent daemon（如将来获准启用），记录源码/镜像/schema 版本。
- Postgres：在本项目 `postgres` 容器中用专用角色对 `cumora` 执行 `pg_dump -Fc`，输出重定向到本次 0700 备份子目录；凭据从已批准注入方式取得，不经命令行参数打印。验证退出码、`pg_restore --list` 和 SHA-256。
- Redis：需要保留。其 claim/去重状态影响重启重复行为，不能只备份 Postgres。拟启用 AOF；应用停止后用正常 Redis shutdown 刷盘，Redis 停止状态下备份完整 `/home/cee/data/cumora-pilot/redis/`（含多段 AOF/manifest/RDB）。恢复须协调 PostgreSQL 一致时间点并验证 TTL/重复任务，不能宣称 exactly-once。
- uploads：server 停止写入后归档 `/home/cee/data/cumora-pilot/uploads/`，保留权限并计算 SHA-256。
- 配置：保存 compose、wrapper、非秘密参数、版本清单及哈希；不复制 secret 值到普通配置备份，秘密恢复依赖原安全注入渠道。
- 镜像：保存实际 image ID/RepoDigests，必要时 `docker image save` 指定 image ID 并计算归档 SHA-256；当前无 image digest。

恢复/回滚：在独立空恢复目录、独立 Compose project、不同 localhost 端口验证数据库 dump、Redis 与 uploads 恢复后再决定替换 pilot。旧镜像回滚必须重新引用保存的 image ID/digest；若 schema 不向后兼容，连同匹配的 DB/Redis/uploads 备份恢复。无旧镜像的首次部署，回滚就是停止 pilot 并保留证据。

清理：目前不删除任何东西。将来先核验备份可恢复，再仅对上述 Compose project 执行 `down`（不加 `-v`、不加 `--remove-orphans`）。数据清理仅限本报告六个 pilot 目录，必须重新核验 realpath、挂载、备份和明确删除授权；优先精确改名隔离归档，不提供 broad recursive delete，不执行 prune，不触碰 TREK/cee-wiki。

## 状态

| 状态 | 本次结果 |
| --- | --- |
| configured | 否；只有配置预览，缺秘密注入/OAuth 配置且提醒约束未满足 |
| built | 否，未构建 |
| running | 否，未启动任何 pilot 容器 |
| healthy | 未验证 |
| manually-verified | 否 |
| pilot-passed | 否 |
| adopted | 否 |

## Adoption recommendation

`pilot-needs-fix`。当前属于启动前约束/配置阻塞，不是 Docker 构建失败。下一步需要确定安全注入来源与 OAuth provider，以及解决“不改源码”和“完全禁用提醒”的冲突；在此之前不应启动。
