# Wiki 部署包边界

`cee-wiki` 是 canonical Vault；`cee-lackeys` 只保存运行配置、适配脚本和部署契约，不复制一份长期知识库。部署时由发布脚本从独立的 `cee-wiki` 工作区生成不可变 revision，运行时只消费该 revision。

## Vault allowlist

发布包只允许以下路径：

- `.claude-obsidian.json`
- `inbox/`
- `.raw/`
- `wiki/`

这些路径对应标准 Wiki Skill 所需的 Vault 选择文件、来源收件箱、不可变捕获、canonical 页面、source/claim ledgers、索引与 hot context。`wiki/` 是长期知识；`inbox/` 和 `.raw/` 保留来源，不在打包时改写。

本地 `cee-wiki` 的 `projects/`、`research/`、`memory/`、`work/` 未晋升内容，以及 `.obsidian/`、`.vault-meta/`、`.vendor/`、`.agents/`、`scripts/`、`tests/`、`templates/`、`schemas/`、`views/` 和工具缓存不进入服务器 Vault 发布包。运行配置、密钥、队列、日志、备份和 worker 状态也不进入 Vault。

## Revision 与镜像

每个发布包包含 `manifest.json`，记录 `schema`、`revision`、生成时间、allowlist 和每个文件的 SHA-256。客户端只在 manifest 校验完整后激活 `published/current`；不能把正在生成的目录挂到 Obsidian 或 Cumora。

桌面端获得的是只读语义的发布镜像。人类编辑只写草稿和提交包，提交包必须带 `operation_id`、`base_revision`、目标路径、基线哈希和来源。lackeys 重新读取当前 canonical，检查冲突与来源后，才通过 Wiki transaction 发布新 revision。

## Cumora 边界

Cumora `server` 的默认容器不能直接写 canonical Vault。推荐映射是：

- `published/`：挂入容器只读，应用读取 `published/current`；
- `submissions/inbox/`：仅作为草稿提交包入口，可写；
- canonical Vault：只挂到独立的 Wiki worker，或由 worker 通过受控路径访问；
- 提交包进入队列后，worker 在锁外分析、锁内执行 transaction，完成后再发布新的镜像。

见 [Cumora 映射说明](../cumora-pilot/wiki-mapping.md) 和 [Compose override](../cumora-pilot/compose.wiki.example.yaml)。默认 `compose.yaml` 不挂载 Vault，也不会改变现有 Cumora 服务权限。

## 命令

从本机治理后的 Vault 生成发布包：

```bash
python3 scripts/package-wiki-publish.py \
  --vault /absolute/path/to/cee-wiki \
  --output dist/wiki \
  --revision 2026-09-21.1
```

校验已生成包：

```bash
python3 scripts/verify-wiki-publish.py dist/wiki/2026-09-21.1
```

这两个命令只处理文件和哈希，不替代 `claude-obsidian` transaction inspect/apply，也不会自动写入 canonical Vault。
