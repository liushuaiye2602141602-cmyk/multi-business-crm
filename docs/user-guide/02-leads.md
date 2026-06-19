# 线索管理（Leads）

## 概述

线索模块是外贸业务流程的起点，用于管理从各渠道获取的潜在客户信息。业务人员可以对线索进行分级、评分、跟进，直至将合格线索转化为正式客户。

---

## 入口地址

| 页面 | URL |
|------|-----|
| 线索列表 | `/leads` |
| 新建线索 | `/leads/new` |
| 线索详情 | `/leads/[id]` |
| 编辑线索 | `/leads/[id]/edit` |

---

## 主要字段

### 基本信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `company` | 文本 | 公司名称 |
| `contactName` | 文本 | 联系人姓名 |
| `country` | 文本 | 国家/地区 |
| `phone` | 文本 | 电话号码 |
| `email` | 文本 | 电子邮箱 |
| `whatsapp` | 文本 | WhatsApp 号码 |

### 来源与分类

| 字段 | 类型 | 说明 |
|------|------|------|
| `source` | 枚举 (LeadSource) | 线索来源 |
| `sourceWebsite` | 文本 | 来源网址 |
| `businessLineId` | 关联 | 所属业务线（BusinessLine） |

**LeadSource 来源枚举值：**

- `MANUAL_OUTREACH` — 人工开发
- `WEBSITE` — 网站
- `FACEBOOK` — Facebook
- `TIKTOK` — TikTok
- `WHATSAPP` — WhatsApp
- `EMAIL` — 邮件
- `REFERRAL` — 介绍
- `EXHIBITION` — 展会
- `OTHER` — 其他

### 状态与评级

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | 枚举 (LeadStatus) | 线索状态 |
| `temperature` | 枚举 (LeadTemperature) | 线索热度：HOT（热）、WARM（温）、COLD（冷） |
| `grade` | 枚举 (LeadGrade) | 线索等级：A、B、C、D |

### 需求与商务信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `requirement` | 文本 | 客户需求描述 |
| `interestProducts` | 文本 | 感兴趣的产品 |
| `inquiryContent` | 文本 | 询盘内容 |
| `budget` | 数值 (Decimal 12,2) | 预算金额 |
| `currency` | 枚举 (Currency) | 币种：USD、EUR、CNY |
| `expectedClosing` | 日期 | 预计成交日期 |
| `nextFollowUp` | 日期 | 下次跟进日期 |
| `remark` | 文本 | 备注 |

### AI 分析字段（系统自动生成）

| 字段 | 类型 | 说明 |
|------|------|------|
| `aiScore` | 数值 (0-100) | AI 评分 |
| `aiSummary` | 文本 | AI 生成的摘要 |
| `aiTags` | JSON | AI 生成的标签 |

---

## 状态流转

线索状态按以下流程推进：

```
NEW（新建）
  ↓
CONTACTED（已联系）
  ↓
REQUIREMENT_CONFIRMING（需求确认中）
  ↓
QUOTING（报价中）
  ↓
NEGOTIATING（谈判中）
  ↓
QUALIFIED（合格）
  ↓
WON（成交）/ LOST（丢失）/ DORMANT（休眠）
```

| 状态 | 中文 | 说明 |
|------|------|------|
| `NEW` | 新建 | 初始状态，尚未联系 |
| `CONTACTED` | 已联系 | 已完成首次联系 |
| `REQUIREMENT_CONFIRMING` | 需求确认中 | 正在确认客户具体需求 |
| `QUOTING` | 报价中 | 已向客户提供报价 |
| `NEGOTIATING` | 谈判中 | 与客户进行商务谈判 |
| `QUALIFIED` | 合格 | 确认为合格线索，可转化为客户 |
| `WON` | 成交 | 成功签单 |
| `LOST` | 丢失 | 跟进失败 |
| `DORMANT` | 休眠 | 暂无进展，进入休眠状态 |

---

## 操作步骤

### 新建线索

1. 导航至 `/leads/new`，或在工作台点击"新建线索"快捷按钮
2. 填写联系人基本信息（公司名称、联系人姓名、国家等）
3. 选择线索来源和所属业务线
4. 填写需求描述、感兴趣的产品等商务信息
5. 设定线索热度和等级（可由 AI 评分后自动建议）
6. 点击"保存"完成创建

### 编辑线索

1. 在线索详情页点击"编辑"按钮，或直接访问 `/leads/[id]/edit`
2. 修改需要更新的字段
3. 点击"保存"完成编辑

### AI 智能分析

1. 在线索详情页点击 **AI 分析** 按钮（`AIAnalysisButton` 组件）
2. 系统调用 AI 分析引擎，对线索进行综合评估
3. 分析结果包括：
   - 评分（0-100 分）
   - 需求摘要和提取的需求要点
   - 资质等级建议（qualificationLevel）
   - 意向等级建议（intentLevel）
   - 买家类型推测
   - 风险点提示
   - 建议的跟进话术（WhatsApp/邮件模板）
   - 下一步行动建议
4. 分析完成后可选择：
   - **应用评级**：将 AI 建议的等级自动填入线索字段
   - **追加到备注**：将分析摘要追加至备注字段
   - **创建任务**：自动创建跟进任务

> **注意：** AI 分析功能需要配置 `AI_API_KEY`、`AI_API_BASE_URL`、`AI_MODEL` 环境变量。未配置时，AI 分析按钮会显示配置提示。

---

## 转化为客户

当线索状态达到 `QUALIFIED`（合格）或 `WON`（成交）后，可以将线索转化为正式客户（Customer）记录。

- 系统通过 `convertedCustomerId` 字段追踪转化关系
- 转化后，线索详情页会显示关联的客户记录链接
- 线索被删除时，相关的线索活动记录（LeadActivities）将被级联删除

---

## 关联实体

线索模块与以下实体存在关联关系：

| 关联实体 | 说明 |
|----------|------|
| **FollowUps** | 跟进记录 |
| **Quotes** | 报价单 |
| **Tasks** | 任务 |
| **Projects** | 项目 |
| **Emails** | 邮件 |
| **LeadActivities** | 线索活动记录（电话、邮件、WhatsApp、备注等） |

---

## 数据导入导出

| 功能 | 接口地址 |
|------|----------|
| CSV 导入 | `/api/import/leads` |
| CSV 导出 | `/api/export/leads` |

导入时系统会进行基础的数据校验和去重处理。

---

## 已知限制

1. **线索活动记录**：删除线索时，相关的 LeadActivities 记录会被级联删除，此操作不可逆。
2. **批量操作**：当前版本部分支持批量状态变更，暂不支持批量删除。
3. **AI 评分**：评分依赖 AI 服务的可用性，AI 服务异常时评分可能不准确。
4. **多租户数据隔离**：当前版本部分支持，计划在 v2.0 版本中全面实现。
