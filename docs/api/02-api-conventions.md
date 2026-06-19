# API 约定

## REST 风格
- GET: 查询资源
- POST: 创建资源
- PUT: 更新资源
- DELETE: 删除资源

## 命名规范
- 路由: 小写英文，复数形式（如 `/api/email/accounts`）
- 查询参数: camelCase（如 `businessLineId`）
- JSON 字段: camelCase

## 分页
```
GET /api/email/accounts?page=1&limit=20
```

## 筛选与排序
列表接口通常支持:
- `search`: 搜索关键词
- `status`: 按状态筛选
- `businessLineId`: 按业务线筛选
- `sort`: 排序字段
- `order`: 排序方向 (asc/desc)

## 创建资源
```
POST /api/xxx
Content-Type: application/json

{ "field1": "value1", "field2": "value2" }
```

## 更新资源
```
PUT /api/xxx/[id]
Content-Type: application/json

{ "field1": "new_value" }
```

## 删除资源
```
DELETE /api/xxx/[id]
```

## 批量操作
CSV 导入:
```
POST /api/import/leads
Content-Type: multipart/form-data
Body: CSV file
```

CSV 导出:
```
GET /api/export/leads?status=NEW&businessLineId=1
```

## 关联资源
使用 ID 引用关联资源:
```json
{
  "leadId": 1,
  "customerId": 2,
  "businessLineId": 1
}
```

## 金额格式
- 字段类型: Decimal(12,2)
- 货币字段: USD, EUR, CNY (Currency enum)
- 汇率字段: exchangeRate (Decimal 12,6)

## 日期格式
ISO 8601 格式: `"2026-01-15T10:30:00.000Z"`

## 唯一标识
- 自动编号字段: `quoteNo`, `orderNo`, `invoiceNo` (unique)
- 自增 ID: 所有模型使用自增整数 ID
