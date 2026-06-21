import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const businessLine = await prisma.businessLine.findFirst({
    where: { code: "FLEX" },
  });

  if (!businessLine) {
    console.error("未找到软包装业务线");
    return;
  }

  const leads = [
    { company: "PetPack USA Inc", contactName: "John Smith", country: "美国", email: "john@petpackusa.com", interestProducts: "stand up pouch, quad seal bag", inquiryContent: "pet packaging company USA lead John - looking for reliable supplier for dog food bags" },
    { company: "TierVerpackung GmbH", contactName: "Lukas Müller", country: "德国", email: "lukas@tierverpackung.de", interestProducts: "flat bottom pouch, retort pouch", inquiryContent: "German pet bag buyer Lukas - need high barrier packaging for European market" },
    { company: "Maple Packaging Co", contactName: "Emma Thompson", country: "加拿大", email: "emma@maplepack.ca", interestProducts: "stand up pouch, spout pouch", inquiryContent: "Canadian packaging inquiry Emma - looking for pet food packaging solutions" },
    { company: "Happy Paws Distribution", contactName: "Robert Chen", country: "美国", email: "robert@happypaws.com", interestProducts: "dog food bag, pet treat pouch", inquiryContent: "need dog food bag supplier - require 10kg and 20kg sizes with zipper" },
    { company: "Global Pet Solutions", contactName: "Sarah Johnson", country: "澳大利亚", email: "sarah@globalpet.com.au", interestProducts: "pet packaging, food pouch", inquiryContent: "looking for pet packaging China factory - need OEM production" },
    { company: "Premium Pet Foods Ltd", contactName: "Michael Brown", country: "英国", email: "michael@premiumpet.co.uk", interestProducts: "custom quad seal bag, coffee style bag", inquiryContent: "custom quad seal bag inquiry - need premium packaging for organic pet food" },
    { company: "EuroPetPack", contactName: "Anna Schmidt", country: "德国", email: "anna@europetpack.de", interestProducts: "stand up pouch, flat bottom pouch", inquiryContent: "stand up pouch supplier Europe - looking for EU certified manufacturer" },
    { company: "PetFood Wholesale", contactName: "David Wilson", country: "美国", email: "david@petfoodwholesale.com", interestProducts: "bulk pet food packaging", inquiryContent: "bulk pet food packaging supplier - need 100,000+ pcs monthly" },
    { company: "Budget Pet Supplies", contactName: "Lisa Wang", country: "加拿大", email: "lisa@budgetpet.ca", interestProducts: "pet food bag, treat pouch", inquiryContent: "cheap pet food bag manufacturer - price sensitive, need competitive quotes" },
    { company: "Quick Quote Pet", contactName: "Tom Harris", country: "美国", email: "tom@quickquotepet.com", interestProducts: "pet packaging, stand up pouch", inquiryContent: "I want quotation for pet packaging - need prices for 5kg, 10kg, 20kg bags" },
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
        source: "WEBSITE",
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
