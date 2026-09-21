# 删除重复身份文件：2026-09-20.3

按用户要求，删除九个 Agent 的 IDENTITY.md、SOUL.md：配置源 18 个文件、BYOA 实际工作目录 18 个文件、Cumora agent_workspace 18 条文件记录。只删除与前一版 SHA-256 一致的副本，避免覆盖后续编辑。

角色身份、职责和原则已完整包含在 UI systemPrompt；本次仅移除多余文件引用、更新版本标记，没有删减核心工作原则。保留之前 BYOA 显式注入 UI 提示词的修复，不依赖隐藏文件。九个角色各保留一个原生 Skill 和三份 references，共 36 份文件／记录，按需读取。

删除前备份及结果位于服务器 `/home/cee/apps/cumora-pilot/agent-config/20260920.3/`：preimage.json、local-prune-preimage.json、applied.json。历史发行归档与恢复材料保留，不属于活动配置。没有删除聊天、记忆或 Codex 会话。

验证：九个数据库角色及核心提示词匹配、18 条冗余工作区记录不存在、36 份技能文件匹配；服务端原生 persona／技能索引读取通过。实际本地文件另行检查，Cumora 健康检查通过。无需重复付费模型调用；既有指令注入路径不变。

维护脚本 configure-cumora-agents 支持有哈希前提的 remove_files，并在 verify 检查已删除；rollback 可恢复被移除的记录，遇到新改动拒绝覆盖。当前 manifest 的 remove_files 是本次迁移记录，不表示还需读取这些文件。
