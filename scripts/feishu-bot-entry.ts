/**
 * 飞书机器人启动入口
 * 确保环境变量在所有模块初始化前加载
 */
import { loadEnvConfig } from "@next/env";

// 必须在所有其他 import 之前加载环境变量
loadEnvConfig(process.cwd());

// 验证关键配置
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || typeof dbUrl !== "string" || dbUrl.length === 0) {
  console.error("❌ 飞书机器人启动失败：未读取到数据库连接配置");
  console.error("   请检查 .env 文件中 DATABASE_URL 是否已配置");
  process.exit(1);
}

console.log("✅ 环境变量已加载");

// 动态导入真正的机器人模块
import("./feishu-bot").then(({ startFeishuBot }) => {
  startFeishuBot().catch((err) => {
    console.error("❌ 飞书机器人启动失败:", err);
    process.exit(1);
  });
});
