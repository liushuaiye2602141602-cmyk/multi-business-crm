# API 示例

## 1. 登录

```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}' \
  -c cookies.txt
```

响应:

```json
{
  "message": "登录成功",
  "user": {
    "id": 1,
    "name": "管理员",
    "email": "admin@example.com",
    "role": "ADMIN",
    "tenantId": 1
  }
}
```

---

## 2. 获取当前用户

```bash
curl http://localhost:3003/api/auth/me -b cookies.txt
```

---

## 3. 创建线索

```bash
curl -X POST http://localhost:3003/api/leads \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company": "Acme Corp",
    "contactName": "John Smith",
    "country": "United States",
    "email": "john@acme.com",
    "phone": "+1-555-0123",
    "whatsapp": "+1-555-0123",
    "source": "WEBSITE",
    "status": "NEW",
    "temperature": "WARM",
    "grade": "B",
    "requirement": "LED 灯具采购",
    "interestProducts": "LED Panel Light, LED Bulb",
    "budget": 50000,
    "currency": "USD",
    "businessLineId": 1
  }'
```

---

## 4. 获取线索列表

```bash
curl "http://localhost:3003/api/leads?status=NEW&businessLineId=1&page=1&limit=20" \
  -b cookies.txt
```

---

## 5. 更新线索状态

```bash
curl -X PUT http://localhost:3003/api/leads/1 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status": "CONTACTED", "temperature": "HOT"}'
```

---

## 6. AI 分析线索

```bash
curl -X POST http://localhost:3003/api/ai/analyze-lead \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"leadId": 1}'
```

---

## 7. AI 销售建议

```bash
curl -X POST http://localhost:3003/api/ai/sales-suggest \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"entityType": "customer", "entityId": 1}'
```

---

## 8. 创建客户

```bash
curl -X POST http://localhost:3003/api/customers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company": "Global Trading Ltd",
    "contactName": "李四",
    "country": "China",
    "phone": "+86-138-0000-0000",
    "email": "lisi@globaltrading.com",
    "customerType": "TRADER",
    "customerStatus": "ACTIVE",
    "lifecycleStage": "POTENTIAL",
    "leadGrade": "A",
    "source": "REFERRAL",
    "businessLineId": 1
  }'
```

---

## 9. 创建报价

```bash
curl -X POST http://localhost:3003/api/quotes \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "quoteTitle": "LED Panel Light 报价",
    "productName": "LED Panel Light 600x600",
    "specs": "600x600mm, 40W, 4000K",
    "quantity": 1000,
    "unitPrice": 25.50,
    "totalPrice": 25500,
    "currency": "USD",
    "paymentTerms": "T/T 30% deposit, 70% before shipment",
    "deliveryTime": "25-30 days",
    "validDays": 30,
    "deliveryTerm": "FOB Shenzhen",
    "shippingTerm": "Sea freight",
    "customerId": 1,
    "leadId": 1,
    "businessLineId": 1
  }'
```

---

## 10. 添加报价明细

```bash
curl -X POST http://localhost:3003/api/quotes/1/items \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "itemName": "LED Panel Light 600x600",
    "specification": "600x600mm, 40W, 4000K, CRI>80",
    "quantity": 1000,
    "unit": "pcs",
    "unitPrice": 25.50,
    "totalPrice": 25500,
    "sortOrder": 1
  }'
```

---

## 11. 创建订单

```bash
curl -X POST http://localhost:3003/api/orders \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "orderTitle": "Acme LED Panel 订单",
    "customerId": 1,
    "quoteId": 1,
    "businessLineId": 1,
    "totalAmount": 25500,
    "currency": "USD",
    "paymentTerm": "T/T 30/70",
    "deliveryTerm": "FOB Shenzhen",
    "expectedDeliveryDate": "2026-03-15"
  }'
```

---

## 12. 创建跟进记录

```bash
curl -X POST http://localhost:3003/api/follow-ups \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "method": "EMAIL",
    "content": "已发送产品目录和报价单",
    "customerFeedback": "客户表示感兴趣，需要内部讨论",
    "nextAction": "下周三跟进",
    "followUpDate": "2026-01-15T10:00:00.000Z",
    "nextFollowUpDate": "2026-01-22T10:00:00.000Z",
    "leadId": 1,
    "customerId": 1
  }'
```

---

## 13. 创建任务

```bash
curl -X POST http://localhost:3003/api/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "跟进 Acme Corp 报价",
    "description": "客户已收到报价，需确认是否接受",
    "type": "FOLLOW_UP",
    "priority": "HIGH",
    "dueDate": "2026-01-22T10:00:00.000Z",
    "leadId": 1,
    "customerId": 1,
    "quoteId": 1
  }'
```

---

## 14. 配置邮件账户

```bash
curl -X POST http://localhost:3003/api/email/accounts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "工作邮箱",
    "provider": "ALIYUN",
    "emailAddress": "sales@company.com",
    "imapHost": "imap.qiye.aliyun.com",
    "imapPort": 993,
    "smtpHost": "smtp.qiye.aliyun.com",
    "smtpPort": 465,
    "smtpSecure": true,
    "username": "sales@company.com",
    "password": "email-password"
  }'
```

---

## 15. 发送邮件

```bash
curl -X POST http://localhost:3003/api/email/send \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "accountId": 1,
    "to": "john@acme.com",
    "subject": "Re: LED Panel Light Inquiry",
    "body": "Dear John,\n\nThank you for your interest. Please find attached our quotation.\n\nBest regards",
    "bodyHtml": "<p>Dear John,</p><p>Thank you for your interest. Please find attached our quotation.</p><p>Best regards</p>",
    "leadId": 1,
    "customerId": 1
  }'
```

---

## 16. 获取收件箱

```bash
curl "http://localhost:3003/api/email/inbox?accountId=1&limit=30" \
  -b cookies.txt
```

---

## 17. 同步邮件

```bash
curl -X POST http://localhost:3003/api/email/sync \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"accountId": 1, "limit": 50}'
```

---

## 18. 获取邮件线程

```bash
curl "http://localhost:3003/api/email/threads?accountId=1&limit=20" \
  -b cookies.txt
```

---

## 19. 外部线索 Webhook

```bash
curl -X POST http://localhost:3003/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "x-crm-source-code: website-form-001" \
  -H "x-crm-api-key: your-api-key-hash" \
  -d '{
    "company": "New Prospect Inc",
    "contactName": "Jane Doe",
    "email": "jane@newprospect.com",
    "phone": "+1-555-0456",
    "source": "WEBSITE",
    "requirement": "Solar panel inquiry",
    "businessLineCode": "SOLAR"
  }'
```

---

## 20. AI 控制面板 -- 获取设置

```bash
curl http://localhost:3003/api/ai-control/settings \
  -b cookies.txt
```

---

## 21. AI 控制面板 -- 更新设置

```bash
curl -X PUT http://localhost:3003/api/ai-control/settings \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "aiEnabled": true,
    "salesAgentEnabled": true,
    "emailAgentEnabled": false,
    "followUpAgentEnabled": true,
    "executionMode": "APPROVAL",
    "workHoursStart": 9,
    "workHoursEnd": 18,
    "maxContactsPerDay": 10
  }'
```

---

## 22. AI 控制面板 -- 创建策略规则

```bash
curl -X POST http://localhost:3003/api/ai-control/rules \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "限制折扣发送",
    "type": "SOFT",
    "action": "block_discount",
    "condition": {"discountPercent": {">": 20}},
    "value": "20",
    "isActive": true
  }'
```

---

## 23. CSV 导入线索

```bash
curl -X POST http://localhost:3003/api/import/leads \
  -b cookies.txt \
  -F "file=@leads.csv"
```

CSV 列头需与 Lead 字段对应: `company`、`contactName`、`country`、`phone`、`email`、`source`、`status` 等。

---

## 24. CSV 导出客户

```bash
curl "http://localhost:3003/api/export/customers?status=ACTIVE&businessLineId=1" \
  -b cookies.txt \
  -o customers_export.csv
```
