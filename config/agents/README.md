# cee-lackeys Agent 配置

`manifest.json` 是九个职责角色的可审阅配置清单；身份和工作原则完整保存在 manifest 的系统提示词中；各角色目录仅保留原生 Cumora Skill 及引用。角色分别为总助、产品、会议、任务、研究、订阅、知识、工程协作和服务器运维。

该目录不包含凭据、会话或用户材料。变更后通过 `scripts/configure-cumora-agents.mjs` 的 inspect/apply/verify 维护事务部署；不能把写入本地文件等同运行中配置已改变。每次新发布应使用新版本和独立操作目录，保留服务器 preimage；遇到已存在的备份时脚本拒绝覆盖。

角色能力状态在每个手册的 `references/capabilities.json` 中明确记录。主模型／辅助模型继承现有 BYOA 配置。用户不需要业务项目／任务级独立上下文；沿用各 Agent 的连续会话。完整角色级硬权限隔离仍未实现。UI 系统提示词在 2026-09-20.2 起包含核心说明，BYOA 将 UI 提示词显式注入；本地 `.agents/skills` 供按需读取，服务端副本可通过显式 CLI 读取，不再把文件存在当作自动加载。

## Skill 来源与投影

`config/skills/` 是本仓库维护的 Skill 唯一事实源；角色目录中的 `skills/cumora-operations`
只作为软链接投影，不单独编辑。每个角色仍保留自己的 `lackeys-role`，因为它承载角色职责和
边界。`cumora-operations` 负责 Cumora 的 MCP 调用、文档、Kanban、Calendar、回执核验和失败
处理流程，所有九个角色共享同一版本。

部署时，manifest 中的虚拟 `skills/...` 路径写入 Cumora `agent_workspace`，再投影到对应
Agent home 的 `<agent-id>/.agents/skills/`。该服务器运行目录由 Cumora 管理，不手工创建第二份
Skill 源，也不把 `AGENTS.md` 当作持久配置。制作配置发布包时必须同时携带
`config/skills/`，否则角色目录中的软链接会失效；部署事务读取后写入服务器 workspace，
不会把本地软链接本身写进数据库。

当前配置版本为 2026-09-22.3。重复身份／原则文件不再作为活动配置；历史部署证据见 `docs/agent-config/2026-09-20-remove-persona-files.md`，加载机制见 `docs/agent-config/2026-09-20-instruction-layers.md`，首版记录见 `docs/agent-config/2026-09-20-roles.md`。
