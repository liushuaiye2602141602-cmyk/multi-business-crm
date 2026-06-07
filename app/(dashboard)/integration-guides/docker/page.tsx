import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import CopyButton from "@/components/ui/CopyButton";

export default function DockerGuidePage() {
  const commands = [
    { label: "查看运行中的容器", cmd: "docker ps" },
    { label: "启动 PostgreSQL 容器", cmd: "docker start multi-business-crm-postgres" },
    { label: "查看容器日志", cmd: "docker logs multi-business-crm-postgres" },
    { label: "停止容器", cmd: "docker stop multi-business-crm-postgres" },
    { label: "查看容器详情", cmd: "docker inspect multi-business-crm-postgres" },
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader title="Docker 本地服务" backHref="/integration-guides" />

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">当前 Docker PostgreSQL 配置</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">容器名称</span>
            <span className="font-medium">multi-business-crm-postgres</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">数据库名称</span>
            <span className="font-medium">multi_business_crm</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">用户名</span>
            <span className="font-medium">postgres</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">外部端口</span>
            <span className="font-medium">5433</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">DATABASE_URL</span>
            <span className="font-mono text-xs">postgresql://postgres:123456@localhost:5433/multi_business_crm?schema=public</span>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">常用命令</h2>
        <div className="space-y-3">
          {commands.map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <code className="text-xs text-gray-600 font-mono">{item.cmd}</code>
              </div>
              <CopyButton text={item.cmd} label="复制" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">注意事项</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5">⚠</span>
            <p>不要随意删除 PostgreSQL 容器，否则会丢失所有数据。</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5">⚠</span>
            <p>如果需要重建容器，请先备份数据库数据。</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">ℹ</span>
            <p>容器停止后，CRM 将无法访问数据库，需要重新启动容器。</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">数据备份建议</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>建议定期备份数据库，可以使用以下命令：</p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <code className="text-xs font-mono">
              docker exec multi-business-crm-postgres pg_dump -U postgres multi_business_crm &gt; backup.sql
            </code>
          </div>
          <p>恢复备份：</p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <code className="text-xs font-mono">
              cat backup.sql | docker exec -i multi-business-crm-postgres psql -U postgres multi_business_crm
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}
