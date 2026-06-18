export type IntentType =
  | "create_lead"
  | "create_customer"
  | "create_order"
  | "add_followup"
  | "query_leads"
  | "query_customers"
  | "query_orders"
  | "query_tasks"
  | "update_order_status"
  | "update_customer_grade"
  | "complete_task"
  | "create_quote"
  | "help"
  | "unknown";

export const IM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_lead",
      description: "创建新的销售线索。当用户提到要添加线索、新建潜在客户时使用。",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "公司名称" },
          contactName: { type: "string", description: "联系人姓名" },
          country: { type: "string", description: "国家" },
          email: { type: "string", description: "邮箱" },
          phone: { type: "string", description: "电话" },
          whatsapp: { type: "string", description: "WhatsApp" },
          requirement: { type: "string", description: "需求描述" },
          interestProducts: { type: "string", description: "感兴趣的产品" },
          remark: { type: "string", description: "备注" },
        },
        required: ["company", "contactName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_customer",
      description: "创建新客户。当用户提到要添加客户、新建客户时使用。",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "公司名称" },
          contactName: { type: "string", description: "联系人姓名" },
          country: { type: "string", description: "国家" },
          email: { type: "string", description: "邮箱" },
          phone: { type: "string", description: "电话" },
          whatsapp: { type: "string", description: "WhatsApp" },
          website: { type: "string", description: "网站" },
          industry: { type: "string", description: "行业" },
          remark: { type: "string", description: "备注" },
        },
        required: ["company", "contactName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_order",
      description: "创建新订单。当用户提到要建订单、新建订单时使用。",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "客户公司名称（用于查找客户）" },
          orderTitle: { type: "string", description: "订单标题" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                itemName: { type: "string", description: "产品名称" },
                quantity: { type: "number", description: "数量" },
                unitPrice: { type: "number", description: "单价" },
              },
              required: ["itemName"],
            },
            description: "订单明细",
          },
          currency: { type: "string", description: "币种：USD/EUR/CNY" },
          notes: { type: "string", description: "备注" },
        },
        required: ["customerName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_followup",
      description: "添加跟进记录。当用户提到要记录跟进、添加沟通记录时使用。",
      parameters: {
        type: "object",
        properties: {
          targetName: { type: "string", description: "客户或线索公司名称" },
          content: { type: "string", description: "跟进内容" },
          method: {
            type: "string",
            enum: ["EMAIL", "WHATSAPP", "PHONE", "MEETING", "VIDEO_CALL", "OTHER"],
            description: "跟进方式",
          },
          nextAction: { type: "string", description: "下一步动作" },
        },
        required: ["targetName", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_leads",
      description: "查询线索信息。当用户问到线索、潜在客户、新客户数量时使用。",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "线索状态筛选" },
          limit: { type: "number", description: "返回数量，默认10" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_customers",
      description: "查询客户信息。当用户问到客户列表、客户详情时使用。",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "按公司名搜索（模糊匹配）" },
          status: { type: "string", description: "客户状态筛选" },
          limit: { type: "number", description: "返回数量，默认10" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_orders",
      description: "查询订单信息和进度。当用户问到订单状态、订单进度、发货情况时使用。",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "按客户名筛选" },
          status: { type: "string", description: "订单状态筛选" },
          limit: { type: "number", description: "返回数量，默认10" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_tasks",
      description: "查询待办任务。当用户问到今天有什么任务、待办事项时使用。",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "任务状态：PENDING/IN_PROGRESS/COMPLETED" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_order_status",
      description: "更新订单状态。当用户提到要更改订单状态、发货、确认订单时使用。",
      parameters: {
        type: "object",
        properties: {
          orderNo: { type: "string", description: "订单编号" },
          status: {
            type: "string",
            enum: ["DRAFT", "CONFIRMED", "PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED", "CANCELLED"],
            description: "新状态"
          },
        },
        required: ["orderNo", "status"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_customer_grade",
      description: "更新客户等级。当用户提到要升级客户、降级客户、改变客户评级时使用。",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "客户公司名称" },
          grade: { type: "string", enum: ["A", "B", "C", "D"], description: "新等级" },
        },
        required: ["company", "grade"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "complete_task",
      description: "完成任务。当用户提到要标记任务完成、完成某个待办时使用。",
      parameters: {
        type: "object",
        properties: {
          taskTitle: { type: "string", description: "任务标题（模糊匹配）" },
        },
        required: ["taskTitle"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_quote",
      description: "创建报价单。当用户提到要报价、生成报价单时使用。",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "客户公司名称" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                itemName: { type: "string", description: "产品名称" },
                quantity: { type: "number", description: "数量" },
                unitPrice: { type: "number", description: "单价" },
                unit: { type: "string", description: "单位" },
              },
              required: ["itemName"],
            },
            description: "报价明细",
          },
          currency: { type: "string", description: "币种：USD/EUR/CNY" },
          validDays: { type: "number", description: "报价有效天数" },
          notes: { type: "string", description: "备注" },
        },
        required: ["customerName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "help",
      description: "当用户问到你能做什么、怎么使用时，返回帮助信息。",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const INTENT_SYSTEM_PROMPT = `你是一个外贸 CRM 系统的 AI 助手。用户通过 IM（飞书等）与你对话，你需要理解用户的意图并调用相应的工具来完成操作。

规则：
1. 根据用户的消息，选择最合适的工具调用
2. 从用户消息中提取参数，如果缺少必填参数，不要猜测，而是调用 help 工具提示用户提供
3. 如果用户的消息无法匹配任何工具，调用 help 工具
4. 用中文回复用户
5. 回复要简洁，适合 IM 阅读`;
