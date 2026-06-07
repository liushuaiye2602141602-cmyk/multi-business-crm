import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import CopyButton from "@/components/ui/CopyButton";
import { AlertTriangle, CheckCircle, Terminal, Database, Key, Server } from "lucide-react";

export default function MaintenanceGuidePage() {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="维护指南" description="系统维护、备份恢复和常见问题处理" />

      {/* 如何启动系统 */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Server size={20} className="text-blue-500" />
          <h2 className="text-lg font-semibold">如何启动系统</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">方式一：使用启动脚本</p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <code className="text-sm">双击 start-crm.bat</code>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">方式二：手动启动</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <code className="text-sm">docker start multi-business-crm-postgres</code>
                <CopyButton text="docker start multi-business-crm-postgres" label="复制" />
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <code className="text-sm">npm run dev</code>
                <CopyButton text="npm run dev" label="复制" />
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            启动后访问：<strong>http://localhost:3003</strong>
          </div>
        </div>
      </Card>

      {/* 如何备份数据库 */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Database size={20} className="text-green-500" />
          <h2 className="text-lg font-semibold">如何备份数据库</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">使用备份脚本</p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <code className="text-sm">双击 backup-db.bat</code>
            </div>
            <p className="text-xs text-gray-500 mt-1">备份文件保存在 backups 目录</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">手动备份</p>
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <code className="text-sm">docker exec multi-business-crm-postgres pg_dump -U postgres multi_business_crm &gt; backup.sql</code>
              <CopyButton text='docker exec multi-business-crm-postgres pg_dump -U postgres multi_business_crm > backup.sql' label="复制" />
            </div>
          </div>
        </div>
      </Card>

      {/* 如何恢复数据库 */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Database size={20} className="text-orange-500" />
          <h2 className="text-lg font-semibold">如何恢复数据库</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">使用恢复脚本</p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <code className="text-sm">双击 restore-db.bat</code>
            </div>
            <p className="text-xs text-gray-500 mt-1">会提示选择备份文件并二次确认</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">手动恢复</p>
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <code className="text-sm">cat backup.sql | docker exec -i multi-business-crm-postgres psql -U postgres multi_business_crm</code>
              <CopyButton text="cat backup.sql | docker exec -i multi-business-crm-postgres psql -U postgres multi_business_crm" label="复制" />
            </div>
          </div>
        </div>
      </Card>

      {/* 危险命令 */}
      <Card className="border-red-200 bg-red-50">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-red-600" />
          <h2 className="text-lg font-semibold text-red-800">绝对不要随便执行的危险命令</h2>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-red-100 rounded-lg">
            <code className="text-sm text-red-800">npx prisma db push --force-reset</code>
            <p className="text-xs text-red-600 mt-1">会清空数据库所有数据！</p>
          </div>
          <div className="p-3 bg-red-100 rounded-lg">
            <code className="text-sm text-red-800">npx prisma migrate reset</code>
            <p className="text-xs text-red-600 mt-1">会重置数据库并删除所有数据！</p>
          </div>
          <div className="p-3 bg-red-100 rounded-lg">
            <code className="text-sm text-red-800">docker rm -f multi-business-crm-postgres</code>
            <p className="text-xs text-red-600 mt-1">会删除 PostgreSQL 容器和所有数据！</p>
          </div>
        </div>
      </Card>

      {/* 正常开发命令 */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={20} className="text-gray-500" />
          <h2 className="text-lg font-semibold">正常开发命令</h2>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div>
              <code className="text-sm">npx prisma generate</code>
              <p className="text-xs text-gray-500">生成 Prisma Client</p>
            </div>
            <CopyButton text="npx prisma generate" label="复制" />
          </div>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div>
              <code className="text-sm">npm run build</code>
              <p className="text-xs text-gray-500">构建项目</p>
            </div>
            <CopyButton text="npm run build" label="复制" />
          </div>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div>
              <code className="text-sm">npm run dev</code>
              <p className="text-xs text-gray-500">启动开发服务器</p>
            </div>
            <CopyButton text="npm run dev" label="复制" />
          </div>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div>
              <code className="text-sm">npx prisma studio</code>
              <p className="text-xs text-gray-500">打开 Prisma 数据库管理界面</p>
            </div>
            <CopyButton text="npx prisma studio" label="复制" />
          </div>
        </div>
      </Card>

      {/* 常见问题 */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={20} className="text-blue-500" />
          <h2 className="text-lg font-semibold">常见问题</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">端口 3003 被占用怎么办？</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <code className="text-sm">netstat -ano | findstr :3003</code>
                <CopyButton text="netstat -ano | findstr :3003" label="复制" />
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <code className="text-sm">taskkill /PID [进程ID] /F</code>
                <CopyButton text="taskkill /PID " label="复制" />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">数据库连接失败怎么办？</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <code className="text-sm">docker ps</code>
                <CopyButton text="docker ps" label="复制" />
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <code className="text-sm">docker start multi-business-crm-postgres</code>
                <CopyButton text="docker start multi-business-crm-postgres" label="复制" />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">AI 功能失败怎么办？</p>
            <p className="text-sm text-gray-600">
              检查 .env 文件中 AI_PROVIDER、AI_BASE_URL、AI_API_KEY、AI_MODEL 是否正确配置。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
