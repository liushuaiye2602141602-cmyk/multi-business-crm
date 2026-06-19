# 数据导入与导出 (Data Import & Export)

## 概述

系统支持 CSV 格式的数据导入和导出，用于批量数据迁移和报表生成。

## 数据导入

### 支持导入的数据类型

| 类型 | API 路径 | 去重策略 |
|------|---------|---------|
| 线索 (Leads) | `POST /api/import/leads` | 邮箱去重；或 公司+邮箱 组合去重 |
| 客户 (Customers) | `POST /api/import/customers` | 邮箱去重；或 公司+邮箱 组合去重 |
| 产品 (Products) | `POST /api/import/products` | 产品名+业务线 ID 去重 |

### 导入步骤

1. 导航到 `/imports`
2. 选择要导入的数据类型（线索/客户/产品）
3. 下载 CSV 模板（可选）
4. 准备 CSV 文件
5. 上传 CSV 文件
6. 系统自动解析、去重、关联业务线
7. 导入完成，ActivityLog 记录操作

### CSV 字段映射

**线索 (Leads) 导入字段：**

| CSV 列 | 对应字段 | 必填 |
|--------|---------|------|
| company | `company` | 是 |
| contactName | `contactName` | 是 |
| country | `country` | 否 |
| phone | `phone` | 否 |
| email | `email` | 否 |
| source | `source` (LeadSource) | 否 |
| status | `status` (LeadStatus) | 否 |
| businessLine | `businessLineId`（按名称/代码匹配） | 否 |

**客户 (Customers) 导入字段：**

| CSV 列 | 对应字段 | 必填 |
|--------|---------|------|
| company | `company` | 是 |
| contactName | `contactName` | 是 |
| customerType | `customerType` | 否 |
| businessLine | `businessLineId`（按名称/代码匹配） | 否 |

**产品 (Products) 导入字段：**

| CSV 列 | 对应字段 | 必填 |
|--------|---------|------|
| name | `name` | 是 |
| category | `category` | 否 |
| businessLine | `businessLineId`（按名称/代码匹配） | 是 |

### 导入注意事项

- 所有导入操作写入 ActivityLog
- 业务线通过 `name` 或 `code` 字段匹配，不存在时跳过关联
- 当前硬编码 `tenantId: 1`
- CSV 解析使用自定义 `parseCSVLine` 函数

## 数据导出

### 支持导出的数据类型

| 类型 | API 路径 | 输出格式 |
|------|---------|---------|
| 线索 (Leads) | `GET /api/export/leads` | CSV (BOM) |
| 客户 (Customers) | `GET /api/export/customers` | CSV (BOM) |
| 项目 (Projects) | `GET /api/export/projects` | CSV (BOM) |
| 报价 (Quotes) | `GET /api/export/quotes` | CSV (BOM) |
| 任务 (Tasks) | `GET /api/export/tasks` | CSV (BOM) |
| 跟进记录 (Follow-ups) | `GET /api/export/follow-ups` | CSV (BOM) |
| 产品 (Products) | `GET /api/export/products` | CSV (BOM) |
| AI 分析 | `GET /api/export/ai-analyses` | CSV (BOM) |
| Webhook 日志 | `GET /api/export/webhook-logs` | CSV (BOM) |

### 导出特点

- CSV 文件添加 **BOM 头**（`﻿`），确保中文在 Excel 中正确显示
- 枚举字段导出为中文标签（如 LeadStatus.NEW → "新建"）
- 导出范围为当前租户的全部数据（当前所有数据）

### 导出步骤

1. 导航到 `/exports`
2. 选择要导出的数据类型
3. 点击导出按钮
4. 浏览器自动下载 CSV 文件

## 相关页面

| 路由 | 功能 |
|------|------|
| `/imports` | 数据导入中心 |
| `/exports` | 数据导出中心 |
