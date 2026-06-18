import "dotenv/config";
import { PrismaClient } from "./lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const p = await prisma.iMPlatform.findUnique({ where: { name: "feishu" } });
  if (p) {
    console.log("✅ 飞书配置存在");
    console.log("  App ID:", p.appId ? `${p.appId.slice(0, 8)}...` : "❌ 未配置");
    console.log("  App Secret:", p.appSecret ? "已配置" : "❌ 未配置");
    console.log("  Encrypt Key:", p.encryptKey ? "已配置" : "未配置");
    console.log("  IsActive:", p.isActive);
  } else {
    console.log("❌ 数据库中没有飞书配置！请访问 http://localhost:3003/im-settings 添加");
  }

  const msgCount = await prisma.iMMessage.count();
  console.log(`\n📊 IM 消息总数: ${msgCount}`);

  if (msgCount > 0) {
    const recent = await prisma.iMMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { imUser: true },
    });
    console.log("\n最近 5 条消息:");
    recent.forEach(m => {
      console.log(`  [${m.direction}] ${m.content.slice(0, 50)} (${m.createdAt.toLocaleString()})`);
    });
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
