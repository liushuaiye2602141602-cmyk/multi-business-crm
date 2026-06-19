# 飞书机器人无回复诊断报告

## 诊断结论

**根因：飞书机器人脚本未持续运行。**

飞书使用**长连接模式（WebSocket）**，SDK 主动连接飞书服务器。该连接是独立进程，不能与 `npm run dev` 合并。

## 诊断验证

| 步骤 | 结果 |
|------|------|
| 飞书配置是否存在 | ✅ IMPlatform 表有记录，appId 已配置 |
| App Secret 是否存在 | ✅ 长度 32 字符 |
| 是否激活 | ✅ isActive = true |
| 机器人脚本能否启动 | ✅ 显示 "ws client ready" |
| WebSocket 连接 | ✅ 长连接建立成功 |
| 机器人是否持续运行 | ❌ **未运行**（需要单独终端） |

## 根因

`npm run feishu:bot` 是一个**独立进程**，需要在单独终端中持续运行。

- `npm run dev` 只启动 Web 应用（localhost:3003）
- `npm run feishu:bot` 启动飞书 WebSocket 连接
- 两者是**独立进程**，不能合并

## 解决方案

### 方案1：两个终端（推荐）

**终端1：** 启动 Web 应用
```bash
cd D:\web_project\multi-business-crm
npm run dev
```

**终端2：** 启动飞书机器人
```bash
cd D:\web_project\multi-business-crm
npm run feishu:bot
```

看到以下输出表示成功：
```
🤖 飞书机器人启动中... App ID: cli_aab9c6f8d6b8dcb6
✅ 飞书长连接启动中...
[ws] ws client ready
```

### 方案2：后台运行（Windows）

```bash
cd D:\web_project\multi-business-crm
start /B npm run feishu:bot
```

### 方案3：pm2（推荐生产环境）

```bash
npm install -g pm2
pm2 start "npx tsx scripts/feishu-bot.ts" --name feishu-bot
pm2 save
```

## 飞书后台检查清单

在飞书开放平台确认：

| 检查项 | 操作 |
|--------|------|
| 1. 应用已启用机器人能力 | 应用详情 → 添加应用能力 → 机器人 |
| 2. 事件订阅方式为长连接 | 事件与回调 → 订阅方式 → 长连接 |
| 3. 已订阅 im.message.receive_v1 | 事件与回调 → 添加事件 |
| 4. 权限已申请 | 权限管理 → im:message, im:message:send_as_bot |
| 5. 权限已审批 | 权限管理 → 查看审批状态 |
| 6. 机器人已加入群聊 | 在群设置中添加机器人 |
| 7. 应用已发布 | 版本管理 → 创建版本 → 发布 |

## 测试步骤

1. 启动两个终端
2. 在飞书中找到机器人
3. 发送：`@机器人名称 你好`
4. 终端2应显示 `📩 收到消息`
5. 机器人应回复消息

## 注意事项

- 长连接模式下，**必须 @机器人** 才能触发
- 普通发送"你好"无回复是**预期行为**
- 消息必须在**机器人所在的群聊**中发送
