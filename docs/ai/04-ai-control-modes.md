# AI 执行模式 (AI Control Modes)

## 概述

执行模式 (Execution Mode) 控制 AI 操作的自动化程度。管理员可以在 AI 控制面板中切换执行模式，以平衡效率和安全性。

## 三种执行模式

### Manual Only（仅手动）

```
executionMode = "MANUAL"
```

**行为：**
- 所有 AI 操作必须由用户手动触发
- AI 不会自动执行任何操作
- 仅提供建议和分析结果供用户参考
- SOFT 规则和 HARD 规则均生效

**适用场景：**
- 系统上线初期，团队尚未建立 AI 使用信任
- 高度敏感的业务场景
- 需要完全控制每一条发出的消息

### Approval Required（需要审批）

```
executionMode = "APPROVAL"
```

**行为：**
- AI 可以准备操作内容（如消息草稿、任务建议）
- 实际执行需要人工审批确认
- SOFT 规则和 HARD 规则均生效

**适用场景：**
- 希望利用 AI 提高效率，但保留人工审核环节
- 团队正在逐步熟悉 AI 辅助流程
- 对外沟通需要质量把关

### Auto Execute（自动执行）

```
executionMode = "AUTO"
```

**行为：**
- AI 自动执行允许的操作
- **SOFT 规则被跳过**（在 AUTO 模式下不阻止）
- **HARD 规则仍然生效**（始终阻止）

**适用场景：**
- 团队对 AI 行为有充分信任
- 希望最大化自动化效率
- 有 HARD 规则作为安全底线

## 模式对 Guard 检查的影响

Guard 五步检查在不同模式下的行为差异：

| 检查步骤 | MANUAL | APPROVAL | AUTO |
|---------|--------|----------|------|
| 1. 全局开关 (aiEnabled) | 关闭则阻止 | 关闭则阻止 | 关闭则阻止 |
| 2. 模块开关 | 关闭则阻止 | 关闭则阻止 | 关闭则阻止 |
| 3. 工时检查 | 非工作时间阻止 | 非工作时间阻止 | 非工作时间阻止 |
| 4. SOFT 策略规则 | 阻止 | 阻止 | **跳过** |
| 4. HARD 策略规则 | 阻止 | 阻止 | 阻止 |
| 5. 速率限制 | 超限阻止 | 超限阻止 | 超限阻止 |

## 配置方式

### 通过 UI 配置

1. 导航到 `/ai-control-panel`
2. 在设置区域找到 "执行模式" 下拉框
3. 选择目标模式
4. 保存设置

### 通过 API 配置

```
PUT /api/ai-control/settings
```

```json
{
  "executionMode": "AUTO"
}
```

## 审计记录

每次 Guard 检查的结果都记录到 `AIExecutionLog`，包含当时的执行模式：

```json
{
  "actionType": "email_send",
  "entityType": "Lead",
  "entityId": 42,
  "allowed": true,
  "reason": "AUTO 模式允许",
  "mode": "AUTO"
}
```

查看日志：

```
GET /api/ai-control/logs?mode=AUTO&allowed=true
```

## 建议

| 团队阶段 | 推荐模式 | 说明 |
|---------|---------|------|
| 首次部署 | MANUAL | 确认 AI 输出质量后再开放 |
| 试用期 | APPROVAL | 积累审批经验，建立使用规范 |
| 成熟期 | AUTO + HARD Rules | 自动执行但保留安全底线 |
| 高信任 | AUTO + 最少 Rules | 最大效率，依赖 HARD 规则保护 |

> **重要提示：** 切换到 AUTO 模式前，务必配置足够的 HARD 规则作为安全底线。HARD 规则在所有模式下都不可跳过。
