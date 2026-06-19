# AI 控制面板

## 概述

AI 控制面板是所有 AI 功能的集中管控中心，提供全局开关、模块开关、执行模式、工作时间、速率限制和策略规则等治理能力。通过控制面板，管理者可以精细控制 AI 自动化行为的范围和权限，确保 AI 操作符合业务规范和合规要求。

## 页面入口

| 页面 | 路由 | 说明 |
|------|------|------|
| AI 控制面板 | `/ai-control-panel` | AI 治理与管控中心 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai-control/settings` | 获取当前控制设置 |
| PUT | `/api/ai-control/settings` | 更新控制设置 |
| GET | `/api/ai-control/rules` | 获取策略规则列表 |
| POST | `/api/ai-control/rules` | 创建新策略规则 |
| DELETE | `/api/ai-control/rules/[id]` | 删除指定策略规则 |
| GET | `/api/ai-control/logs` | 获取执行日志列表 |

## 控制设置（AIControlSettings）

### 全局开关（Global Toggle）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| aiEnabled | Boolean | true | AI 功能总开关，关闭后所有 AI 功能将被禁用 |

### 模块开关（Module Toggles）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| salesAgentEnabled | Boolean | true | 销售建议代理 |
| emailAgentEnabled | Boolean | true | 邮件自动化代理 |
| whatsappAgentEnabled | Boolean | true | WhatsApp 自动化代理 |
| followUpAgentEnabled | Boolean | true | 跟进自动任务代理 |
| prospectingEnabled | Boolean | true | 线索挖掘代理 |

### 执行模式（Execution Mode）

| 模式 | 说明 |
|------|------|
| MANUAL（手动模式） | AI 仅提供分析和建议，所有操作需用户手动执行（默认） |
| APPROVAL（审批模式） | AI 自动生成操作建议，但执行前需用户确认审批 |
| AUTO（自动模式） | AI 全自动执行操作，无需人工干预 |

### 工作时间（Work Hours）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| workHoursStart | Number | 9 | 工作开始时间（24 小时制） |
| workHoursEnd | Number | 18 | 工作结束时间（24 小时制） |

AI 自动化操作仅在工作时间内执行。

### 速率限制（Rate Limiting）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| maxContactsPerDay | Number | 5 | 每日最大联系人数 |

限制 AI 每日自动联系客户的数量，防止过度打扰。

## 策略规则（AIPolicyRule）

策略规则提供细粒度的 AI 行为管控，支持定义自定义的业务规则。

### 规则字段

| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 规则名称 |
| type | Enum | 规则类型：`HARD`（硬性规则）/ `SOFT`（柔性规则） |
| action | Enum | 规则动作（见下方枚举） |
| condition | JSON | 规则条件（JSON 格式） |
| value | String | 规则阈值或参数 |
| isActive | Boolean | 规则是否启用 |

### 规则动作（Action）

| 值 | 说明 |
|------|------|
| block_send | 阻止发送（邮件/WhatsApp 等） |
| limit_rate | 限制频率 |
| block_blacklist | 黑名单阻止 |
| block_discount | 阻止折扣审批 |

### HARD vs SOFT 规则区别

| 规则类型 | 行为 |
|------|------|
| HARD（硬性规则） | 始终生效，无论执行模式如何都会阻止操作 |
| SOFT（柔性规则） | 在 MANUAL 和 APPROVAL 模式下阻止操作，在 AUTO 模式下放行 |

### 规则示例

- **黑名单阻止（block_blacklist）：** 禁止向特定国家或邮箱域名发送自动消息。
- **折扣审批（block_discount）：** 折扣超过指定百分比时阻止自动发送，需人工审批。
- **频率限制（limit_rate）：** 对同一客户每周最多联系次数设置上限。

## 执行日志（AIExecutionLog）

所有 AI 操作都会记录执行日志，用于审计和回溯。

### 日志字段

| 字段 | 类型 | 说明 |
|------|------|------|
| tenantId | String | 租户 ID |
| actionType | Enum | 操作类型 |
| entityType | String | 实体类型 |
| entityId | String | 实体 ID |
| allowed | Boolean | 是否允许执行 |
| reason | String | 执行或拒绝的原因 |
| mode | String | 当时的执行模式 |

### actionType 枚举值

| 值 | 说明 |
|------|------|
| email_send | 邮件发送 |
| whatsapp_send | WhatsApp 发送 |
| task_create | 任务创建 |
| lead_analyze | 线索分析 |

## 守护流程（Guard Flow）

每次 AI 执行操作前，系统会按以下 5 步流程进行检查：

```
步骤 1：检查全局 AI 开关
  └─ aiEnabled = false → 阻止操作
  
步骤 2：检查对应模块开关
  └─ 对应模块 enabled = false → 阻止操作

步骤 3：检查工作时间
  └─ 当前时间不在 workHoursStart ~ workHoursEnd → 阻止操作

步骤 4：应用策略规则
  └─ HARD 规则匹配 → 始终阻止
  └─ SOFT 规则匹配且非 AUTO 模式 → 阻止

步骤 5：检查速率限制
  └─ 当日已联系人数 >= maxContactsPerDay → 阻止操作

全部通过 → 允许执行
```

所有检查结果（通过或阻止）均记录到执行日志中。

## 使用说明

### 配置全局设置

1. 进入 AI 控制面板页面（`/ai-control-panel`）。
2. 在"全局设置"区域调整 AI 总开关和各模块开关。
3. 选择适合的执行模式（建议从 MANUAL 开始，熟悉后再切换为 APPROVAL 或 AUTO）。
4. 设置工作时间和每日联系人数上限。
5. 保存设置。

### 创建策略规则

1. 在控制面板中找到"策略规则"区域。
2. 点击「新建规则」。
3. 填写规则名称。
4. 选择规则类型（HARD 或 SOFT）。
5. 选择规则动作。
6. 配置条件和参数。
7. 保存规则。

### 查看执行日志

1. 在控制面板中找到"执行日志"区域。
2. 按时间、操作类型、是否允许等条件筛选日志。
3. 查看每条操作的详细信息，包括执行原因或拒绝原因。

## 安全建议

- 新部署建议将执行模式设为 MANUAL，逐步过渡到 AUTO。
- 为 block_blacklist 规则配置好黑名单，避免向不适宜的对象发送自动消息。
- 合理设置 maxContactsPerDay，避免过度营销导致客户反感。
- 定期查看执行日志，了解 AI 操作的整体情况。
- HARD 规则应谨慎使用，建议仅用于合规性要求严格的场景。
