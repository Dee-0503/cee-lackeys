# cee-lackeys Agent 配置

`manifest.json` 是九个职责角色的可审阅配置清单；身份和工作原则完整保存在 manifest 的系统提示词中；各角色目录仅保留原生 Cumora Skill 及引用。角色分别为总助、产品、会议、任务、研究、订阅、知识、工程协作和服务器运维。

该目录不包含凭据、会话或用户材料。变更后通过 `scripts/configure-cumora-agents.mjs` 的 inspect/apply/verify 维护事务部署；不能把写入本地文件等同运行中配置已改变。每次新发布应使用新版本和独立操作目录，保留服务器 preimage；遇到已存在的备份时脚本拒绝覆盖。

角色能力状态在每个手册的 `references/capabilities.json` 中明确记录。主模型／辅助模型继承现有 BYOA 配置。用户不需要业务项目／任务级独立上下文；沿用各 Agent 的连续会话。完整角色级硬权限隔离仍未实现。UI 系统提示词在 2026-09-20.2 起包含核心说明，BYOA 将 UI 提示词显式注入；本地 .agents/skills 供按需读取，服务端副本可通过显式 CLI 读取，不再把文件存在当作自动加载。

当前为 2026-09-20.3，已删除重复身份／原则文件；部署证据见 `docs/agent-config/2026-09-20-remove-persona-files.md`，加载机制见 `docs/agent-config/2026-09-20-instruction-layers.md`；首版记录见 `docs/agent-config/2026-09-20-roles.md`。
