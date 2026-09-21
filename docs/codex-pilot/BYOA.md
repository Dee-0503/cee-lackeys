# 固定 BYOA 配对准备

## 2026-09-20 配对后修复

用户已成功配对；前台托管四个 Agent 后，timeout 在宽限时间结束强制终止进程，退出 137。原配对脚本仅接受 0/124，因而未执行 systemd 启动。这是部署脚本交接错误，不是 OAuth/模型或配对失败。

已确认配对文件存在且 codex-pilot 无残留进程，修复脚本支持已有配对直接启动，并在 137 情况下仍要求配对文件存在才继续。已 enable/start cumora-byoa-pilot.service。

2026-09-20T04:35:50Z 验证：ActiveState=active、SubState=running、NRestarts=0；服务版本 0.18.6；Atlas/Bram/Iris/Nova 四条 wake-stream 和 control-stream 连接成功；数据库 computers 状态 online 共 1。没有重新配对或输出凭据。真实 Agent 中文对话仍待人工验证。下方“尚未配对”描述为之前准备阶段记录，以本段为当前状态。

## Observed

已创建 `/home/cee/apps/cumora-byoa-pilot/`，使用已核验 v0.18.6 源码归档；node_modules 和 Node 20.20.2 从当前固定 Cumora server 容器复制，未安装 latest。官方源码未修改。

专用 PATH 中 codex wrapper 只注入 Huitex custom provider 和 low；不改变工作目录，不覆盖 Cumora 的权限参数。daemon 使用 codex-pilot 身份；主模型 gpt-6-astra、triage gpt-5.6-terra，并发各 1。

官方 --doctor 实际调用 big brain / small brain 成功，wake-path 检查通过，判定 Codex healthy/runnable。其他未安装引擎不属于本次失败。版本命令确认 0.18.6。

固定 systemd unit `/etc/systemd/system/cumora-byoa-pilot.service` 已安装，但尚未 enable/start；配对文件存在才可运行。未调用官方 --install-service，避免其 latest 启动命令。CUMORA_SUPERVISED=0，因此上游更新检查只提示，不自动升级。

## Human acceptance

1. 在 https://lackeys.ceee.cloud 的“设置你的计算机”选择 Codex，生成配对码。
2. 执行 `ssh -t cee-server 'sudo bash /home/cee/apps/cumora-byoa-pilot/pair.sh'`，隐藏输入配对码。不要粘贴页面整条 @latest 命令。
3. 脚本通过 stdin 传递配对码，调用官方 runComputerDaemon；45 秒后停止前台实例，若配对文件成功生成则启动固定 systemd 服务。
4. 回复完成。随后检查宿主在线、测试 Agent 中文回复、工具权限和重启恢复。

## Unknown

尚未配对，未验证真实 Agent、MCP bridge 的完整业务调用或任务恢复。Standalone cc-switch 切换不会自动修改 BYOA wrapper 的 provider 地址；目前明确固定 Huitex，未来切换供应商需要同步受检配置。

## Changed / Not changed

新增 BYOA 源码/运行依赖/启动 wrapper、配对脚本、systemd unit；Codex doctor 可能在专用 .cumora 目录创建诊断文件。未修改运行中 Cumora server、DNS、Wiki、TREK、本机配置和外部通知。

## Rollback

配对后停止服务：`sudo systemctl disable --now cumora-byoa-pilot.service`。保留 `.cumora/computer.json`（含凭据，不打印/入 Git）、Agent 数据及配置。当前没有删除或撤销配对。需要解除 Computer 时通过用户授权的 Cumora UI 操作。

## Adoption recommendation

pilot-needs-fix：daemon configured、doctor 通过；running/manually-verified/完整 BYOA 验收尚未完成。
