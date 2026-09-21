# 自动探查开关修复

## 发现

此前 pilot Compose 为了早期“先不触发后台任务”的临时策略，包含：

```yaml
ENABLE_SCANNER: 'false'
ENABLE_IDLE: 'false'
IDLE_INTERVAL_MS: '0'
```

这确实关闭了 Cumora 的 background scanner 和 idle scheduler。日历 scheduler 一直是单独启动的，但仅日历 scheduler 不等于完整自动探查。

## 修复

已恢复：

```yaml
ENABLE_SCANNER: 'true'
ENABLE_IDLE: 'true'
IDLE_INTERVAL_MS: '900000'
```

服务器已重建 server 容器并通过 healthcheck。启动日志确认：

- background scanner：每 90000ms（90 秒）
- idle scheduler：每 900000ms（15 分钟，至少安静 25 分钟）
- calendar scheduler：每 60000ms（1 分钟）
- 主模型：`gpt-6-astra`
- 辅助模型配置：`gpt-5.6-luna`

BYOA daemon 仍为 active；其本地 triage 配置为 `gpt-5.6-luna`。

## 说明

`ENABLE_AGENT_POD_GC=false`、`ENABLE_CHROME_PVC_GC=false`、`ENABLE_CLUSTER_MONITOR=false` 保持关闭，因为当前是单机 BYOA pilot，没有 managed Kubernetes Agent Pod；这三项不是自动探查开关。

## 状态

configured/running/healthy：是。自动探查已恢复。调用账本在新容器启动后需要等待 scanner/idle 的实际 tick 才会出现新记录；不把启动日志当作模型调用成功。未接入外部通知和真实 Wiki。
