import prisma from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DormantClient from "./DormantClient";

export const dynamic = "force-dynamic";

export default async function DormantCustomersPage() {
  const dormantData = await getDormantCustomers();

  return (
    <div>
      <PageHeader
        title="沉睡客户"
        description="识别长期未跟进的客户，制定激活策略"
        backHref="/customers"
      />
      <DormantClient initialData={dormantData} />
    </div>
  );
}

async function getDormantCustomers() {
  const customers = await prisma.customer.findMany({
    include: {
      followUps: { orderBy: { followUpDate: "desc" }, take: 1 },
    },
  });

  const now = new Date();
  return customers
    .map((c) => {
      const lastFollowUp = c.followUps[0]?.followUpDate || null;
      const daysSince = lastFollowUp
        ? Math.floor((now.getTime() - new Date(lastFollowUp).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return {
        id: c.id,
        company: c.company,
        contactName: c.contactName,
        country: c.country,
        leadGrade: c.leadGrade,
        ownerName: c.ownerName,
        lastFollowUp: lastFollowUp?.toISOString() || null,
        daysSince,
      };
    })
    .filter((c) => c.daysSince >= 60)
    .sort((a, b) => b.daysSince - a.daysSince);
}
