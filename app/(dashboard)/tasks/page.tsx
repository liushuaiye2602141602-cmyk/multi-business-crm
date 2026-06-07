import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil, Plus, CheckCircle } from "lucide-react";
import { deleteTask, markTaskComplete } from "./actions";
import { TaskTypeLabel, TaskStatusLabel, TaskPriorityLabel } from "@/lib/enums";
import { formatDate, formatEnumLabel, isOverdue } from "@/lib/format";
import { getTaskStatusVariant, getTaskPriorityVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const filter = typeof params.filter === "string" ? params.filter : "all";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (filter === "today") {
    where.status = { in: ["PENDING", "IN_PROGRESS"] };
    where.dueDate = { gte: todayStart, lte: todayEnd };
  } else if (filter === "overdue") {
    where.status = { in: ["PENDING", "IN_PROGRESS"] };
    where.dueDate = { lt: todayStart };
  } else if (filter === "week") {
    where.status = { in: ["PENDING", "IN_PROGRESS"] };
    where.dueDate = { gte: todayStart, lte: sevenDaysLater };
  } else if (filter === "completed") {
    where.status = "COMPLETED";
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    include: { lead: true, customer: true, project: true },
  });

  const hasFilters = search || filter !== "all";

  const filterTabs = [
    { key: "all", label: "全部" },
    { key: "today", label: "今日任务" },
    { key: "overdue", label: "已逾期" },
    { key: "week", label: "未来7天" },
    { key: "completed", label: "已完成" },
  ];

  return (
    <div>
      <PageHeader
        title="今日任务"
        description="管理客户跟进任务、逾期提醒和待办事项"
        actions={
          <Link href="/tasks/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            新增任务
          </Link>
        }
      />

      {/* 快捷筛选标签 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filterTabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/tasks?filter=${tab.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <SearchFilterBar
        searchPlaceholder="搜索任务标题、描述..."
        defaultSearch={search}
      />

      <Card padding="none">
        {tasks.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的任务" : "暂无任务"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增任务开始记录"}
            actionLabel={hasFilters ? undefined : "新增任务"}
            actionHref={hasFilters ? undefined : "/tasks/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">标题</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">类型</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">优先级</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">截止日期</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">关联</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => {
                  const overdue = isOverdue(task.dueDate) && task.status !== "COMPLETED" && task.status !== "CANCELLED";
                  return (
                    <tr key={task.id} className={`hover:bg-gray-50 transition-colors ${overdue ? "bg-red-50/50" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/tasks/${task.id}/edit`} className="font-medium text-gray-900 hover:text-blue-600">
                            {task.title}
                          </Link>
                          {overdue && <StatusBadge label="已逾期" variant="danger" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatEnumLabel(task.type, TaskTypeLabel)}</td>
                      <td className="py-3 px-4">
                        <StatusBadge label={TaskStatusLabel[task.status] || task.status} variant={getTaskStatusVariant(task.status)} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge label={TaskPriorityLabel[task.priority] || task.priority} variant={getTaskPriorityVariant(task.priority)} />
                      </td>
                      <td className="py-3 px-4">
                        <span className={overdue ? "text-red-600 font-medium" : "text-gray-500"}>
                          {formatDate(task.dueDate)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">
                        {task.customer?.company || task.lead?.company || task.project?.name || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {task.status !== "COMPLETED" && (
                            <form action={async () => { "use server"; await markTaskComplete(task.id); }}>
                              <button type="submit" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="标记完成">
                                <CheckCircle size={16} />
                              </button>
                            </form>
                          )}
                          <Link href={`/tasks/${task.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Pencil size={16} />
                          </Link>
                          <ConfirmDeleteButton action={async () => { "use server"; await deleteTask(task.id); }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
