import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 获取软包装业务线
  const businessLine = await prisma.businessLine.findFirst({
    where: { code: "FLEX" },
  });

  if (!businessLine) {
    console.error("未找到软包装业务线");
    return;
  }

  const leads = [
    { company: "Aurora Pet Packaging", contactName: "John Miller", country: "美国", email: "john2@aurora.com", interestProducts: "10kg宠物袋", inquiryContent: "重复测试，想了解产品规格和MOQ" },
    { company: "Polar Pet Supply", contactName: "Emma White", country: "加拿大", email: "emma2@polar.com", interestProducts: "15kg袋", inquiryContent: "再次添加，之前询价过，想确认最新价格" },
    { company: "Nordic Paw Packaging", contactName: "Lukas Meyer", country: "德国", email: "lukas2@nordic.com", interestProducts: "20kg袋", inquiryContent: "更新需求，需要高阻隔材质，装冷冻宠物食品" },
    { company: "BluePeak Pet Supply", contactName: "Emma Clark", country: "加拿大", email: "emma2@bluepeak.com", interestProducts: "10kg+15kg袋", inquiryContent: "需要两种规格的袋子，10kg和15kg各5000个" },
    { company: "Titan Pet Packaging", contactName: "Chris Johnson", country: "美国", email: "chris2@titan.com", interestProducts: "10kg袋", inquiryContent: "价格询问，想了解stand up pouch的单价和MOQ" },
    { company: "Orion Pet Solutions", contactName: "Ethan Walker", country: "美国", email: "ethan2@orion.com", interestProducts: "15kg袋", inquiryContent: "样品请求，想先看样品再决定是否下单" },
    { company: "Arctic Pet Supply", contactName: "Emma Lee", country: "加拿大", email: "emma2@arctic.com", interestProducts: "10kg袋", inquiryContent: "MOQ咨询，想了解最小起订量和交期" },
    { company: "Nebula Pet Co", contactName: "David Smith", country: "美国", email: "david2@nebula.com", interestProducts: "20kg袋", inquiryContent: "生产周期，想了解从下单到出货需要多长时间" },
    { company: "Lunar Pet Packaging", contactName: "James Brown", country: "英国", email: "james2@lunar.com", interestProducts: "15kg袋", inquiryContent: "报价请求，请发一份正式报价单" },
    { company: "Galaxy Pet Supply", contactName: "Michael Ross", country: "美国", email: "michael2@galaxy.com", interestProducts: "10kg袋", inquiryContent: "是否支持定制印刷，客户有自己的品牌logo" },
  ];

  for (const lead of leads) {
    const existing = await prisma.lead.findFirst({
      where: { email: lead.email },
    });

    if (existing) {
      console.log(`跳过重复: ${lead.company} (${lead.email})`);
      continue;
    }

    await prisma.lead.create({
      data: {
        company: lead.company,
        contactName: lead.contactName,
        country: lead.country,
        email: lead.email,
        interestProducts: lead.interestProducts,
        inquiryContent: lead.inquiryContent,
        source: "MANUAL_OUTREACH",
        status: "NEW",
        temperature: "WARM",
        grade: "C",
        businessLineId: businessLine.id,
      },
    });

    console.log(`✅ 创建线索: ${lead.company} - ${lead.inquiryContent.slice(0, 20)}...`);
  }

  console.log("\n✅ 所有线索创建完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
