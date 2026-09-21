---
name: cumora-operations
description: "在需要操作 Cumora 文档、看板、卡片、日历、协作消息或技能时使用。提供安全 Codex 的 MCP argv 调用、核验和失败处理流程。"
---

# Cumora 操作

本 Skill 负责 Cumora 的操作协议。角色职责、任务归属和业务判断仍以
`lackeys-role` 及 Agent 的持久角色提示为准。

## 传输方式

安全 Codex 中只能使用当前暴露的 `mcp__cumora__cli` 工具，将完整命令拆成
`argv` 数组传入。不要假设 shell 的 `PATH` 中存在可直接执行的 `cumora`
命令，也不要自行安装或绕过 Cumora daemon 的 CLI bridge。

典型调用形态：

```text
argv=["doc", "ls"]
argv=["kanban", "ls"]
argv=["card", "show", "<card_id>"]
argv=["calendar", "list"]
```

以 MCP 返回的实际帮助和错误为准，不编造参数。命令存在不代表本 Agent
已获得超出当前身份的权限。

## 文档

- 交付文档前先执行 `doc ls`，避免重复创建。
- 新文档使用 `doc create`；已有文档使用 `doc read` 后再 `append`、`prepend`
  或受约束的 `replace`。
- 写入后再次 `doc read`，确认标题、正文和文档 ID。
- 文档交付必须返回 Cumora 文档 ID 或可打开入口；本地路径不能作为唯一交付。

## Kanban

- 任务需要阶段、负责人、阻塞、交接或持续跟踪时，先 `kanban ls/show`。
- 创建卡片前确认目标看板和列，再使用 `card add`；变更负责人用 `card assign`，
  变更阶段用 `card move`，进度和证据用 `card comment`。
- 写入后用 `card show` 复核负责人、列、描述和评论。
- 不把聊天中的“已安排”当作卡片创建成功；没有回执就报告未完成。

## Calendar

- 需要指定时间、截止、重复提醒、定时唤醒或复查时使用 Calendar。
- 先 `calendar list` 查重，再按实际支持的参数使用 `calendar create` 或
  `calendar update`。
- 写入后重新读取事件，确认时间、时区、重复规则和关联对象。
- Calendar 和 Kanban 是独立资源；创建一个不代表另一个已同步。

## 通用核验与失败处理

- 写操作必须等待真实成功回执，并用对应的 `read/show/list` 命令核验。
- 权限不足、参数不支持、身份过期、网络失败或回执不明时，保留原错误并报告；
  不改用本地文件冒充成功，也不盲目重复可能有副作用的请求。
- 对外消息、拉群、发布和扩大范围仍须遵守用户授权与 `lackeys-role` 的协作规则。
- 需要读取本 Skill 的其他资料时，使用 `skills read cumora-operations` 及其引用路径。
