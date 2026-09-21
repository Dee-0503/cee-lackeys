## 最终架构

```

云服务器

  ├─ cee-lackeys runtime

  ├─ Wiki core / wiki-v2 能力

  ├─ cee-wiki canonical

  ├─ 配置、日志、队列、备份

  └─ 提醒编排入口

本地项目 Agent

  └─ claude-mem

     不直接查询或写 Wiki

本地 cee-wiki-mirror

  ├─ 接收发布镜像

  ├─ Obsidian 浏览

  ├─ 人类草稿

  └─ 提交包上传

后期可选

  └─ lackeys 本地文件证据 MCP
```

# 待办

1. *治理本地 cee-wiki*
   - *清点 projects/、research/、memory/、agent-config/ 等目录。*
     - *将稳定知识迁入 wiki/，保留原始材料和开发资料。*
     - *通过 Wiki transaction、索引更新和 lint 验证。*
2. *确定云端部署边界*
   - *分离 canonical Vault、cee-lackeys 运行包和本地开发资料。*
     - *明确服务器实际需要的 Wiki core、Skills、运行脚本和 Vault 数据。*
3. *部署并验收云端 cee-lackeys*
   - *部署 Agent 配置、Wiki 能力、Cumora 接入和调度运行环境。*
     - *核对配置版本、Skill 来源锁定和热更新状态。*
4. *完成 Wiki 云端单一维护链*
   - *服务器 canonical Wiki。*
     - *桌面端只读镜像和草稿提交。*
     - *测试冲突、重复提交、重启恢复和回滚。*
5. 本地env、API-Key文件服务器复用（gh）
6. 验收 Cumora 原生 Kanban / Calendar
   - 验证截止日期、负责人、提醒和事件更新。
     - 落实 Theo 的个人待办、Iris 的大型任务看板和各 Agent 的专业卡片维护。
7. 完成 Orca 双端工程协作
   - 验证桌面与云端 Orca 项目映射。
     - 确认服务器 CLI、外部沙箱、权限和结果回传链路。
8. 第二阶段建设会议录音能力
   - 部署 Whisper 转写、音频存储和保留策略。
     - 会议助手提取纪要和待办，再交给 Sage 入库、Theo 跟进。
9. 补齐主动订阅和提醒基础设施
   - 调度、去重、失败重试、发送记录和恢复机制。
     - 邮件通知如启用，再配置 Resend。
10. RSS 订阅与主动跟踪
这部分由 Echo 负责运行，Theo 只接收需要用户处理的事项，Sage 负责将筛选后的重要内容入库。
需要建设：
    - 订阅源注册表：RSS 地址、主题、频率、时区、通知级别、暂停和取消状态。
    - 定时检查：由统一调度器触发，不由多个 Agent 重复扫描。
    - 去重：根据 GUID、链接、发布时间和内容哈希去重。
    - 增量读取：支持 ETag、Last-Modified 和上次检查游标。
    - 失败处理：超时、解析失败、源失效、重复失败和恢复记录。
    - 内容分层：
      - 普通更新：进入 Echo 摘要。
      - 重要变化：通知用户。
      - 需要行动：交给 Theo 创建待办。
      - 需要长期保存：提交 Sage 审查后进入 Wiki。
      - 需要深入研究：转给 Atlas。
    - 原始 RSS 内容保存到原始来源区或订阅缓存，不把所有更新直接写入 Wiki。
    - 网页正文只在 RSS 摘要不足时再抓取，优先使用 RSS 和低成本读取，不依赖 Firecrawl。
11. 造一个桌面端MCP-参考别人开源的Chatgpt 网页版读桌面端的MCP

