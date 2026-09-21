# 2026-09-21 MCP surface 与辅助模型修正

## Observed

- `OPENAI_MODEL_SUPPORT` 已从 `gpt-5.6-terra` 改为 `gpt-5.6-luna`。
- BYOA daemon 的 `CUMORA_TRIAGE_MODEL` 已同步改为 `gpt-5.6-luna`。
- Cumora server 使用固定 v0.18.6 镜像重建并 healthy；BYOA systemd 服务重启后 active，多个 Agent wake-stream 与 control-stream 已连接。
- v0.18.6 secure Codex 启动参数通过 `mcp_servers.cumora` 注入 MCP server，`enabled_tools=["cli"]`；没有把 Cumora shell CLI 放入 Codex 的 PATH。
- Cumora CLI 的文档子命令存在：`doc ls`、`doc create`、`doc read`、`doc append`、`doc prepend`、`doc replace`、`doc replace-block`、`doc image`、`doc delete`。
- Iris 的 Agent instructions 已修正为 MCP `argv` 形式，明确不要执行 PATH 上的 `cumora`，并使用 `doc ls` 而不是 `doc list`。

## 解释

“原生 CLI”是 Cumora server 内部的命令实现和 MCP bridge 的后端动作面；在安全 Codex turn 中，模型不能直接启动这个 CLI。MCP 工具的 `cli` action 会在 daemon 的受信任边界内转发同一组 argv 到 `/runtime/cli`。因此 `AGENTS.md` 需要说明调用格式和交付规则，但不能把它写成能力授权，也不能要求模型执行不存在的 shell 命令。

角色说明仍然有必要：它规定什么时候必须创建 Cumora 文档、如何返回文档 ID、不得用本地 Markdown 冒充正式文档。真正的能力来源是 MCP 工具和 server CLI registry；提示词只负责行为约束。

## Changed

- `/home/cee/apps/cumora-pilot/runtime.env`：`OPENAI_MODEL_SUPPORT=gpt-5.6-luna`。
- `/home/cee/apps/cumora-byoa-pilot/launch.mjs`：`CUMORA_TRIAGE_MODEL=gpt-5.6-luna`。
- `/home/cee/data/codex-pilot/.cumora/agents/iris-a25c/AGENTS.md`：修正为 MCP `argv` 调用说明，补全文档命令和 `doc ls`。
- Cumora server 与 BYOA daemon 已分别重启；无源码修改，无数据库 migration 变更。

## Status

配置完成，应用和 BYOA healthy。尚未用 Iris 新建一份测试 Cumora 文档；下一次文档交付应先调用 `argv=["doc","ls"]`，再根据结果执行 create/read/append，并返回文档 ID。
