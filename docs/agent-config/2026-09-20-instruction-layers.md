# 九角色指令分层与上下文要求修订

> 本页为 2026-09-20.2 历史实施记录。2026-09-20.3 已按用户要求删除重复 IDENTITY.md／SOUL.md，核心内容保留于系统提示词。当前文件布局见 [删除记录](2026-09-20-remove-persona-files.md)。

版本：2026-09-20.2。用户明确取消按业务项目／任务拆分独立上下文要求：九个职责 Agent 仍各有自己的工作目录与连续 Codex 会话；同一角色自然处理不同业务，不要求用户创建项目空间或填写项目 ID。来源与任务归属仍正常记录。

## 当前配置层级

| 层 | 放什么 | 实际加载方式 |
|---|---|---|
| Cumora UI 的系统提示词 | 角色职责、中文要求、核心边界、协作方式、能力缺口和按需读取入口 | 全部核心内容已放入 UI 字段；BYOA standingPrompt 兼容修复显式带入该字段，覆盖持久 app-server 与单次 exec 两条路径 |
| 每 Agent 根目录 AGENTS.md | Cumora 根据 UI 生成的入口／镜像 | 由 BYOA 重写，不手工维护；本版本受限启动探针未加载其中测试指令，不能依赖它 |
| IDENTITY.md / SOUL.md | 补充身份与原则 | 已部署到各 Agent 根目录；是普通 Markdown，通过明确引用读取，非 Codex 特殊自动加载文件 |
| .agents/skills/lackeys-role/SKILL.md | 本角色流程、适用场景与引用入口 | 原生技能名称／description 可发现，正文按需读取；描述匹配属于模型选择，不是硬性正则触发 |
| 同一 Skill 下的 references/ | 能力状态、交接模板、角色目录 | 根据任务需要显式读取，避免所有正文常驻 |
| .codex/rules/*.rules | Codex 命令执行策略 | 不用于业务说明、身份或手册；本次未创建或放宽规则 |

本地 IDENTITY/SOUL/技能副本与 Cumora agent_workspace 副本均来自 config/agents/；UI 核心提示词优先，避免把副本当独立权威。若 UI 改变长期职责，后续配置维护时同步配置源及副本；代理不自行扩大角色权限。九个角色共享的 CODEX_HOME 未改，不把独有职责写入共享全局目录。

## 核对与纠错

Cumora v0.18.6 普通 AgentEditor 只编辑 name、role、systemPrompt、bio 等；开发者 Agent workspace 是文件查看入口。服务端 buildSystemPrompt 读取数据库 IDENTITY/SOUL，服务端技能索引也可读取 SKILL.md，但 BYOA daemon 不调用该函数，因此旧报告中的后端读取验证不能证明 BYOA 已加载全部手册。

使用实际 Codex 0.155.1 和合成目录／标记，通过 127.0.0.1 本地假 Responses 服务截取请求体；没有联系真实模型、发送 Cumora 消息或读取真实聊天。测试使用 Cumora 对指令发现有影响的 untrusted、ignore-user-config、ignore-rules 和 developerInstructions 传递方式，不代替完整权限或模型行为验收。

| 探针 | AGENTS 标记 | IDENTITY 标记 | 本地技能描述 | 技能正文 | 完整 UI 角色提示词 |
|---|---|---|---|---|---|
| 修复前单次 exec | 未出现 | 未出现 | 出现 | 未自动展开 | 未接入 |
| 修复前持久 app-server | 未出现 | 未出现 | 出现 | 未自动展开 | 未接入 |
| 修复后单次 exec | 未出现 | 未出现 | 出现 | 未自动展开 | 出现 |
| 修复后持久 app-server | 未出现 | 未出现 | 出现 | 未自动展开 | 出现 |

从实际 patched daemon 的 AgentRunner.standingPrompt 方法生成九个角色提示词并逐一验证包含完整 systemPrompt；用会议角色的实际生成内容验证上述两种模型请求路径。该结果证明指令进入请求，不证明模型一定服从所有指令或总会调用技能。

探针代码：scripts/render-cumora-standing-probe.mjs、scripts/probe-codex-instruction-loading.py。探针仅适用于已核实的此 pilot，使用合成目录和本地假服务，无真实模型调用费用。

## 已实施

- 更新九个身份的 UI 核心提示词及 54 份服务端工作区资料，无新建角色、无删改会话历史。
- 删除旧“按项目／任务明确上下文”私聊主题措辞；project_id 改为交接模板可选字段。
- 向 `/home/cee/data/codex-pilot/.cumora/agents/<agent-id>/` 部署 54 份本地身份、原则及 `.agents/skills/lackeys-role/` 文件，不更改自动生成的 AGENTS.md。
- 仅修改 BYOA `server/src/agents/computer/daemon.ts` 中 standingPrompt，追加 UI systemPrompt；不改沙箱、授权、供应商、模型或会话存储。Cumora Web 原版镜像不变。
- 项目 server 刷新缓存；BYOA 重启加载修复。旧 Codex 会话文件保留。

这是一个固定 v0.18.6 的本地兼容修复，上游升级后必须复核／移植，不能默认为上游原生已有保证。源文件原 SHA-256：`bfa42a85dafe6d738bc699e8b0fb37c23cbfbf27795ce4d658d86f0551c66b85`；修复后：`ee4bd3ea4d75ea844ff7d5d5629eb02e46f6ec1b1d09911792c9948961b552f1`。

## 官方文档

2026-09-20 实际获取：

- https://developers.openai.com/codex/guides/agents-md ：常规 AGENTS.md 指令发现。
- https://developers.openai.com/codex/skills ：.agents/skills、名称／描述发现与正文按需加载。
- https://developers.openai.com/codex/rules ：.rules 是命令执行策略，项目级规则依赖可信配置层。

上述是通用 Codex 机制；当前 Cumora 参数下的行为以本次实际启动探针为界，不能直接从通用文档推断全部自动加载。

## 恢复材料与后续边界

服务器私有归档 `/home/cee/apps/cumora-pilot/agent-config/20260920.2/` 保存本次 config/scripts、DB preimage、applied.json、daemon.before.ts、byoa-instructions-preimage.json 和补丁。限定 DB 回滚脚本支持恢复九个角色及原私聊主题；执行前 inspect，若用户后来修改则拒绝盲目覆盖。回退 BYOA 需核对修复后源哈希后恢复 daemon.before.ts；新增本地文件只有仍与本版本哈希相同时才撤销，保留任何后续编辑。停止空闲 BYOA 后操作，再刷新 server 缓存并恢复 BYOA；本轮未执行回滚。

Wiki／转写／Orca／运维外部执行／可靠通知连接器的既有待接入状态不变。业务项目级上下文隔离已从需求和待办中移除，不再列为待补能力。
