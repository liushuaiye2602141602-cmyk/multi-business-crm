import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import ImportSection from "@/components/ImportSection";

export default function ImportsPage() {
  return (
    <div>
      <PageHeader
        title="数据导入"
        description="通过 CSV 文件批量导入数据，支持线索、客户和产品"
      />

      <div className="space-y-6">
        {/* 线索导入 */}
        <ImportSection
          title="线索导入"
          description="批量导入线索数据，根据邮箱或公司名+产品自动去重"
          importUrl="/api/import/leads"
          templateUrl="/api/export/leads"
          templateFields="companyName,name,country,email,whatsapp,sourceWebsite,productInterest,inquiryContent,businessLineCode,source,leadGrade,priority,notes"
        />

        {/* 客户导入 */}
        <ImportSection
          title="客户导入"
          description="批量导入客户数据，根据邮箱或公司名自动去重"
          importUrl="/api/import/customers"
          templateUrl="/api/export/customers"
          templateFields="companyName,country,website,industry,customerType,businessLineCode,source,sourceWebsite,contactName,email,whatsapp,customerStatus,leadGrade,notes"
        />

        {/* 产品导入 */}
        <ImportSection
          title="产品导入"
          description="批量导入产品数据，根据业务线+产品名自动去重"
          importUrl="/api/import/products"
          templateUrl="/api/export/products"
          templateFields="businessLineCode,name,category,englishKeywords,commonSpecs,application,targetMarket,notes,isActive"
        />
      </div>
    </div>
  );
}
