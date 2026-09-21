# Cumora 与 Wiki 目录映射

## 已核验的限制

当前 Cumora pilot 的 Web `server` 以 `10001:10001` 运行，默认只挂载 `runtime.mjs`、`secrets` 和 uploads。9 个 BYOA Agent 则由宿主 `codex-pilot` 运行，每个 Agent 的 Codex home 位于 `/home/cee/data/codex-pilot/.cumora/agents/<agent-id>`，Codex `workspace-write` 只把 Agent home 作为受控文件边界。宿主 `/home/cee/data/cumora-pilot` 为 `root:root`、`750`；Postgres/Redis 目录由专用容器用户管理。不要把 canonical Vault 放进这些 Cumora 数据库目录，也不要为了让 Agent 写文件而放宽数据库目录权限。

## 推荐目录

在服务器上单独建立项目数据根（示例路径，不在本次代码推送中自动创建）：

```text
/home/cee/data/cee-wiki/
├── canonical/                 # 9 个 BYOA Agent 的唯一读写源；不挂到 Cumora Web server
├── published/
│   ├── <revision>/vault/       # 不可变发布包
│   └── current -> <revision>   # 原子发布指针
└── submissions/
    └── inbox/                 # Cumora 只写草稿提交包
```

当前阶段不启用桌面镜像链。`canonical/` 通过 `mount-cumora-wiki-agents.sh` 映射到每个 Agent 的 `workspace/cee-wiki`，Wiki core 只读映射到 `.vendor/claude-obsidian`；9 个 Agent 直接在 canonical 上查询和修改。systemd 服务负责在服务器重启后恢复挂载。

第二阶段才启用 `published/` 只读镜像和 `submissions/inbox/` 草稿提交；它们不参与当前 Agent 写入链。

未来启用桌面链时，`published/` 整体以 `:ro` 挂载，不能只挂 `current` 目录，否则替换 `current` 指针后既有 bind mount 可能仍然指向旧 inode。应用读取 `/app/wiki-published/current`，并以 manifest 的 revision 回传版本。

第二阶段的 `submissions/inbox/` 才给 Cumora `server` 单独一个可写 bind mount，只承载符合 `docs/wiki/submit-package.schema.json` 的草稿提交包。当前阶段它不是 Agent 的写入口；Agent 直接写 `workspace/cee-wiki` 映射下的 canonical Vault。

## 宿主权限建议

实际部署时由运维变更单准备目录和 owner，再启动 override。发布镜像可以 root/worker 持有，提交入口应只允许容器运行 UID 写入；不要对 `/home/cee/data/cee-wiki` 或 `/home/cee/data/cumora-pilot` 使用递归 `777`。UID/GID 以最终镜像和服务账户核验结果为准，不能仅凭本地配置猜测。

## 组合方式

默认 pilot 不改变：

```bash
docker compose -p cumora-pilot -f compose.yaml config --quiet
```

准备好宿主目录后才显式启用：

```bash
export CEE_WIKI_PUBLISHED_ROOT=/home/cee/data/cee-wiki/published
export CEE_WIKI_SUBMISSIONS_ROOT=/home/cee/data/cee-wiki/submissions
docker compose -p cumora-pilot \
  -f compose.yaml -f compose.wiki.example.yaml config --quiet
```

override 只提供文件映射和环境变量；当前 Cumora 版本没有因此自动获得 Wiki API。真正的发布仍需要独立 Wiki worker：它读取 submissions，校验 `base_revision`、路径和来源，调用固定 Wiki core 的 transaction `inspect/apply`，成功后生成新的 published revision，并保留可恢复队列与回执。

## 不采用的映射

- 不把 `/home/cee/data/cee-wiki/canonical` 以 `:rw` 挂进 Cumora server。
- 不把 `cee-wiki` 工作副本和 `cee-lackeys` 代码仓库混成同一目录。
- 不让桌面 Obsidian、Git、Syncthing 或 Cumora server 成为第二个 canonical 写者。
- 不把 uploads 当作 Wiki 提交队列；uploads 仍是 Cumora 自己的业务数据。

上述边界对应本地 `cee-wiki` 的单一维护者、只读镜像和草稿提交设计；正式上线前还要用合成数据验收重复提交、基线冲突、断电恢复和回滚。
