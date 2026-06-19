# CRM API 端点

## 线索 (Leads)

### GET /api/leads
获取线索列表。支持分页、搜索、状态筛选。

### POST /api/leads
创建线索。

必需字段: company, contactName
可选字段: country, phone, email, whatsapp, source, status, temperature, grade, requirement, interestProducts, budget, currency, expectedClosing, nextFollowUp, remark, businessLineId

AI 字段自动填充: aiScore, aiSummary, aiTags

### GET /api/leads/[id]
获取线索详情。

### PUT /api/leads/[id]
更新线索。

### DELETE /api/leads/[id]
删除线索（级联删除 LeadActivity）。

### POST /api/import/leads
CSV 导入线索。

### GET /api/export/leads
导出线索 CSV。

---

## 客户 (Customers)

### GET /api/customers
获取客户列表。支持分页、搜索、状态筛选。

### POST /api/customers
创建客户。

字段: company, contactName, country, phone, email, whatsapp, website, address, industry, customerType, customerStatus, lifecycleStage, leadGrade, source, remark, businessLineId, ownerId, ownerName

### GET /api/customers/[id]
获取客户详情。

### PUT /api/customers/[id]
更新客户。

### DELETE /api/customers/[id]
删除客户（级联删除 CustomerActivity、Contacts）。

### GET /api/customers/pool
获取公海客户列表。

### GET /api/customers/dormant
获取休眠客户列表。

### POST /api/import/customers
CSV 导入客户。

### GET /api/export/customers
导出客户 CSV。

---

## 联系人 (Contacts)

### GET /api/contacts
获取联系人列表。

### POST /api/contacts
创建联系人。字段: customerId(必填), name, position, email, whatsapp, phone, wechat, linkedin, isPrimary, notes

### GET /api/contacts/[id]
获取联系人详情。

### PUT /api/contacts/[id]
更新联系人。

### DELETE /api/contacts/[id]
删除联系人。

---

## 项目 (Projects)

### GET /api/projects
获取项目列表。

### POST /api/projects
创建项目。字段: name, description, status, productCategory, productName, specs, quantity, usage, targetMarket, specialRequirements, amount, currency, startDate, endDate, remark, businessLineId, customerId, leadId

### GET /api/projects/[id]
获取项目详情。

### PUT /api/projects/[id]
更新项目。

### DELETE /api/projects/[id]
删除项目。

### GET /api/export/projects
导出项目。

---

## 跟进记录 (Follow-ups)

### GET /api/follow-ups
获取跟进列表。

### POST /api/follow-ups
创建跟进记录。字段: method(必填), content, customerFeedback, nextAction, followUpDate, nextFollowUpDate, remark, leadId, customerId, projectId

### GET /api/follow-ups/[id]
获取跟进详情。

### PUT /api/follow-ups/[id]
更新跟进。

### DELETE /api/follow-ups/[id]
删除跟进。

### GET /api/export/follow-ups
导出跟进记录。

---

## 任务 (Tasks)

### GET /api/tasks
获取任务列表。

### POST /api/tasks
创建任务。字段: title(必填), description, type, status, priority, dueDate, leadId, customerId, projectId, quoteId, orderId, ownerId, ownerName

自动创建场景: 线索创建、报价发送、订单确认时系统自动创建跟进任务。

### GET /api/tasks/[id]
获取任务详情。

### PUT /api/tasks/[id]
更新任务（含状态变更）。

### DELETE /api/tasks/[id]
删除任务。

### GET /api/export/tasks
导出任务。

---

## 报价 (Quotes)

### GET /api/quotes
获取报价列表。

### POST /api/quotes
创建报价。字段: quoteTitle, productName, specs, quantity, unitPrice, totalPrice, currency, paymentTerms, deliveryTime, validDays, deliveryTerm, shippingTerm, validUntil, content, remarks, terms, leadId, customerId, projectId, customerContactId

quoteNo 自动生成（unique）。

### GET /api/quotes/[id]
获取报价详情（含 QuoteItems）。

### PUT /api/quotes/[id]
更新报价。

### DELETE /api/quotes/[id]
删除报价。

### GET /api/quotes/[id]/items
获取报价明细。

### POST /api/quotes/[id]/items
添加报价明细。字段: productId, itemName, specification, quantity, unit, unitPrice, totalPrice, notes, sortOrder

### PUT /api/quotes/[id]/items/[itemId]
更新报价明细。

### DELETE /api/quotes/[id]/items/[itemId]
删除报价明细。

### GET /api/export/quotes
导出报价。

---

## 订单 (Orders)

### GET /api/orders
获取订单列表。

### POST /api/orders
创建订单。字段: orderTitle, customerId, projectId, quoteId, contactId, businessLineId, totalAmount, currency, paymentTerm, deliveryTerm, expectedDeliveryDate, notes

orderNo 自动生成（unique）。

### GET /api/orders/[id]
获取订单详情（含 OrderItems）。

### PUT /api/orders/[id]
更新订单。

### DELETE /api/orders/[id]
删除订单。

### GET /api/orders/[id]/items
获取订单明细。

### POST /api/orders/[id]/items
添加订单明细。字段: productId, itemName, specification, quantity, unit, unitPrice, totalPrice, notes, sortOrder

### PUT /api/orders/[id]/items/[itemId]
更新订单明细。

### DELETE /api/orders/[id]/items/[itemId]
删除订单明细。

---

## 产品 (Products)

### GET /api/products
获取产品列表。

### POST /api/products
创建产品。字段: name, category, englishKeywords, commonSpecs, application, targetMarket, notes, isActive, businessLineId

### GET /api/products/[id]
获取产品详情。

### PUT /api/products/[id]
更新产品。

### DELETE /api/products/[id]
删除产品。

### POST /api/import/products
CSV 导入产品。

### GET /api/export/products
导出产品。

---

## 模板 (Templates)

### GET /api/templates
获取跟进模板列表。

### POST /api/templates
创建模板。字段: title, scene, subject, content, language, isActive, notes, businessLineId

### GET /api/templates/[id]
获取模板详情。

### PUT /api/templates/[id]
更新模板。

### DELETE /api/templates/[id]
删除模板。

---

## 文档 (Documents)
当前版本部分支持 — 仅支持元数据管理，不支持文件上传。

### GET /api/documents
获取文档列表。

### POST /api/documents
创建文档记录。字段: title, documentType, fileUrl, fileName, notes, relatedType, relatedId

### GET /api/documents/[id]
获取文档详情。

### PUT /api/documents/[id]
更新文档。

### DELETE /api/documents/[id]
删除文档。

---

## 业务线 (Business Lines)

### GET /api/business-lines
获取业务线列表。

### POST /api/business-lines
创建业务线。字段: name(必填, unique), code(必填, unique), description, website, mainProducts

### GET /api/business-lines/[id]
获取业务线详情。

### PUT /api/business-lines/[id]
更新业务线。

### DELETE /api/business-lines/[id]
删除业务线。

---

## 日历事件 (Calendar Events)

### GET /api/calendar-events
获取日历事件列表。

### POST /api/calendar-events
创建日历事件。字段: title, description, eventType, startTime, endTime, allDay, isCompleted, customerId, leadId, projectId

---

## 外部来源 (External Sources)

### GET /api/external-sources
获取外部来源列表。

### POST /api/external-sources
创建外部来源。字段: name, code(unique), sourceType, businessLineId, defaultSource, defaultLeadGrade, defaultPriority, isActive, autoAnalyze, notes

### GET /api/external-sources/[id]
获取详情。

### PUT /api/external-sources/[id]
更新。

### DELETE /api/external-sources/[id]
删除。

---

## Webhook

### POST /api/webhooks/leads
外部线索 Webhook。

请求头: `x-crm-source-code`, `x-crm-api-key`
验证: 通过 ExternalSource 表中 apiKeyHash 校验。
自动去重: 按 email 去重。
自动绑定业务线。
可选自动 AI 分析。
日志记录到 WebhookLog。

---

## 活动日志 (Activity Logs)

### GET /api/activity-logs
获取活动日志列表。

### POST /api/activity-logs
创建活动日志。

---

## 财务 (Finance)

### GET /api/finance/invoices
获取发票列表。

### POST /api/finance/invoices
创建发票。

### GET /api/finance/invoices/[id]
获取发票详情。

### PUT /api/finance/invoices/[id]
更新发票。

### GET /api/finance/payments
获取付款记录。

### POST /api/finance/payments
创建付款记录。
