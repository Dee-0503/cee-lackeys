# Codex + cc-switch-cli 独立配置记录

## Observed

服务器 cee-server；Codex 与 cc-switch-cli 按用户要求分项目安装，不作为 Cumora server 镜像的组成部分。

| 项目 | 固定版本 | 程序入口 | 数据目录 |
| --- | --- | --- | --- |
| Codex | 官方 rust-v0.155.1 | `/home/cee/apps/codex-pilot/codex` | `/home/cee/data/codex-pilot/` |
| cc-switch-cli | SaladDay/cc-switch-cli v5.10.5（第三方 CLI fork） | `/home/cee/apps/cc-switch-pilot/cc-switch` | `/home/cee/data/cc-switch-pilot/` |

- Codex commit：`be2951ea34f0d295ed0becf97079f92fa5f6950e`。
- cc-switch-cli commit：`5ac9eac8fabf30f8d694797772588a668cc800dc`。
- 两个 CLI 由专用 codex-pilot 用户 UID/GID 10002 操作，无 sudo/docker 组、无登录 shell；同一身份是配置管理关系，不是两套相互隔离的服务身份。
- 两者数据目录 0700；Codex auth.json/config.toml、cc-switch.db 均 0600。程序属于 root，专用用户不能替换。
- cc-switch 通过 CC_SWITCH_CONFIG_DIR 使用自己的数据库，通过 CODEX_HOME 只管理 pilot Codex；当前 provider ID `huitex`，名称 Huitex，地址 https://api.huitex.top/v1。
- 注册 provider 时使用受限临时文件，未在 argv 中传入 API key。Codex API key 使用已批准 pilot key 经 stdin 登录保存；cc-switch 为管理 provider 会在自身数据库中保存凭据，不能将该数据库当作普通无密配置上传。
- 从部署用户 home 启动曾因父目录配置无读取权限失败；改为程序入口指定 pilot workspace 后通过，未放宽部署用户配置权限。
- 官方 Codex 单文件包缺少 code-mode-host，导致首次工具调用失败；补齐同版本官方 code-mode-host 和 bubblewrap 后，实际沙箱命令测试成功。
- 中文测试返回“Codex pilot 测试成功。”；命令测试在 workspace-write 下执行 `printf codex-pilot-sandbox-ok` 成功。未访问其他项目文件。
- Cumora v0.18.6 及其 DB/Redis 保持 healthy；没有执行 BYOA 配对。

### 发布包 SHA-256

均下载固定 release URL，并与 GitHub release asset digest 比对成功：

| 文件 | SHA-256 |
| --- | --- |
| Codex Linux x64 musl | `a0ef8b2debc3bf747e07b1a039354de31300ac0dcc2276498ba281470b5d9115` |
| Codex code-mode-host | `9fd083743af55be818aceb351d371fb5136f5b6aa3938f167087373d27067b2d` |
| Codex bwrap | `d94f189cac440eb601dea980a44a40a4bb40452fd21c06a2abfe464f293795b6` |
| cc-switch-cli Linux x64 musl | `feda4dca0ecf01ec90708141cc346972683c27c1097fba22235c5022143f80ed` |

## 配置与本机配置的差异

保留 custom/Huitex、gpt-6-astra、Responses、requires_openai_auth、disable_response_storage、low、pragmatic，以及用户指定 1000000 context / 900000 compact 参数。大上下文参数仅表示配置值，不代表已实际压测或确认反代的容量。

为当前共享服务器试点设置 workspace-write、approval_policy=never、allow_login_shell=false、shell_environment_policy.inherit=none。没有复制 danger-full-access、inherit=all、/ 信任、本机项目路径、MCP、hooks、claude-mem 或插件。Goals 在 Codex 当前版本默认开启，未额外创建 goal。

## 操作

SSH 登录 cee-server 后：

```sh
# 打开终端管理界面（需要交互终端）
sudo -H -u codex-pilot /home/cee/apps/cc-switch-pilot/cc-switch --app codex

# 查看/切换 pilot provider
sudo -H -u codex-pilot /home/cee/apps/cc-switch-pilot/cc-switch --app codex provider list
sudo -H -u codex-pilot /home/cee/apps/cc-switch-pilot/cc-switch --app codex provider switch huitex

# 独立运行 Codex，入口默认使用 pilot workspace
sudo -H -u codex-pilot /home/cee/apps/codex-pilot/codex
```

不要直接在部署用户下运行裸 cc-switch 接管其他配置；不要执行 update 命令或 latest 安装命令。CLI 不是 HTTP 服务，不存在需要绑定的端口，也没有 systemd 常驻进程。

## Inferred

两个工具的独立安装、provider 配置与实际调用已完成。cc-switch 可以管理 standalone Codex，但不自动证明 Cumora 集成成功：Cumora secure adapter 使用 `--ignore-user-config`，必须另行验证 provider 参数和 auth 的显式传递，不能用开启 unsandboxed 作为默认绕过。

## Unknown

Cumora BYOA daemon 的固定版本部署、配对、沙箱模型配置传递、多 Agent 并发、重连/重复任务、长上下文成本及吞吐未验证。cc-switch TUI 用户尚未人工操作。当前仅核验来源/目录行为/关键配置与功能，并非第三方项目全面安全审计。

## Changed

创建专用用户及以上四个 apps/data 目录；安装固定二进制及同版本依赖；新增两个启动入口；在隔离 auth.json 和 cc-switch.db 写入已批准的 pilot 模型凭据。未修改 Cumora 源码或容器配置。

本地新增 docs/codex-pilot/ 和 docs/cc-switch-pilot/；临时源码审查副本 `/tmp/cc-switch-pilot-audit.Bsx3oi/source`。上传时的非秘密暂存脚本位于 `/home/cee/apps/cumora-pilot/`，执行的正式程序入口位于各独立项目目录。未提交 Git。

## Not changed

本机 cc-switch/Codex/Agent 配置、cee-wiki、TREK、Obsidian、claude-mem、MCP、qmd、DNS/Nginx/Cloudflare、外部通知渠道均未修改或接入。既有 Cumora 配对状态不变。

## Human acceptance

可按上述命令打开 cc-switch TUI，确认 Huitex provider。Cumora 网页仍可能显示“设置你的计算机”，因为未配对 daemon；不要照抄其 @latest 命令。

## Rollback

当前无新增常驻服务，无需 Docker stop。退出正在运行的 CLI 即停止对应会话；Cumora server 独立运行不受影响。需备份时分别归档两个 data 目录到 root-only 目录，归档包含凭据，不入 Git/Wiki。卸载前核验无会话运行并保存配置，优先将四个精确项目目录改名归档，禁止删除 /home/cee 或清理其他用户配置。

## Adoption recommendation

`pilot-needs-fix`：standalone Codex/cc-switch 已配置并通过基础调用，Cumora BYOA 集成未完成，不能报告 Agent 宿主验收通过或 adopted。
