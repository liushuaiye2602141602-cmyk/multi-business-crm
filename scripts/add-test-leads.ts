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
    { company: "Aurora Pet Packaging", contactName: "John Miller", country: "美国", email: "john@aurora.com", interestProducts: "10kg宠物袋" },
    { company: "Polar Pet Supply", contactName: "Emma White", country: "加拿大", email: "emma@polar.com", interestProducts: "15kg袋" },
    { company: "Nordic Paw Packaging", contactName: "Lukas Meyer", country: "德国", email: "lukas@nordic.com", interestProducts: "20kg袋" },
    { company: "BluePeak Pet Supply", contactName: "Emma Clark", country: "加拿大", email: "emma@bluepeak.com", interestProducts: "5kg袋" },
    { company: "Titan Pet Packaging", contactName: "Chris Johnson", country: "美国", email: "chris@titan.com", interestProducts: "10kg袋" },
    { company: "Orion Pet Solutions", contactName: "Ethan Walker", country: "美国", email: "ethan@orion.com", interestProducts: "15kg袋" },
    { company: "Arctic Pet Supply", contactName: "Emma Lee", country: "加拿大", email: "emma@arctic.com", interestProducts: "10kg袋" },
    { company: "Nebula Pet Co", contactName: "David Smith", country: "美国", email: "david@nebula.com", interestProducts: "20kg袋" },
    { company: "Lunar Pet Packaging", contactName: "James Brown", country: "英国", email: "james@lunar.com", interestProducts: "15kg袋" },
    { company: "Galaxy Pet Supply", contactName: "Michael Ross", country: "美国", email: "michael@galaxy.com", interestProducts: "10kg袋" },
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
        inquiryContent: `对${lead.interestProducts}感兴趣`,
        source: "MANUAL_OUTREACH",
        status: "NEW",
        temperature: "WARM",
        grade: "C",
        businessLineId: businessLine.id,
      },
    });

    console.log(`✅ 创建线索: ${lead.company}`);
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
