import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil, CheckCircle } from "lucide-react";
import { deleteTask, markTaskComplete } from "./actions";
import { TaskTypeLabel, TaskStatusLabel, TaskPriorityLabel, TaskPriorityColor } from "@/lib/enums";
import { formatDate, formatEnumLabel, isOverdue } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
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
  const status = typeof params.status === "string" ? params.status : "";

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

  // 快捷筛选
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
  } else if (status) {
    where.status = status;
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
    ],
    include: { lead: true, customer: true, project: true },
  });

  const hasFilters = search || filter !== "all" || status;

  return (
    <div>
      <PageHeader
        title="任务管理"
        action={{ label: "新增任务", href: "/tasks/new" }}
      />

      {/* 快捷筛选标签 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link href="/tasks?filter=all"
          className={`px-3 py-1.5 rounded-lg text-sm ${filter === "all" ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50"}`}>
          全部
        </Link>
        <Link href="/tasks?filter=today"
          className={`px-3 py-1.5 rounded-lg text-sm ${filter === "today" ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50"}`}>
          今日任务
        </Link>
        <Link href="/tasks?filter=overdue"
          className={`px-3 py-1.5 rounded-lg text-sm ${filter === "overdue" ? "bg-red-600 text-white" : "bg-white border hover:bg-gray-50"}`}>
          已逾期
        </Link>
        <Link href="/tasks?filter=week"
          className={`px-3 py-1.5 rounded-lg text-sm ${filter === "week" ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50"}`}>
          未来7天
        </Link>
        <Link href="/tasks?filter=completed"
          className={`px-3 py-1.5 rounded-lg text-sm ${filter === "completed" ? "bg-green-600 text-white" : "bg-white border hover:bg-gray-50"}`}>
          已完成
        </Link>
      </div>

      <SearchFilterBar
        searchPlaceholder="搜索任务标题、描述..."
        defaultSearch={search}
      />

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">标题</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">类型</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">优先级</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">截止日期</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">关联</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const overdue = isOverdue(task.dueDate) && task.status !== "COMPLETED" && task.status !== "CANCELLED";
              return (
                <tr key={task.id} className={`border-b last:border-0 hover:bg-gray-50 ${overdue ? "bg-red-50" : ""}`}>
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      {task.title}
                      {overdue && <Badge label="已逾期" className="bg-red-100 text-red-700" />}
                    </div>
                  </td>
                  <td className="py-3 px-4">{formatEnumLabel(task.type, TaskTypeLabel)}</td>
                  <td className="py-3 px-4">
                    <Badge label={formatEnumLabel(task.status, TaskStatusLabel)}
                      className={task.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"} />
                  </td>
                  <td className="py-3 px-4">
                    <Badge label={formatEnumLabel(task.priority, TaskPriorityLabel)}
                      className={TaskPriorityColor[task.priority] || "bg-gray-100 text-gray-700"} />
                  </td>
                  <td className="py-3 px-4">
                    <span className={overdue ? "text-red-600 font-medium" : ""}>
                      {formatDate(task.dueDate)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {task.customer?.company || task.lead?.company || task.project?.name || "-"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {task.status !== "COMPLETED" && (
                        <form action={async () => { "use server"; await markTaskComplete(task.id); }}>
                          <button type="submit" className="p-1 text-gray-400 hover:text-green-600" title="标记完成">
                            <CheckCircle size={16} />
                          </button>
                        </form>
                      )}
                      <Link href={`/tasks/${task.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                        <Pencil size={16} />
                      </Link>
                      <ConfirmDeleteButton action={async () => { "use server"; await deleteTask(task.id); }} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    message={hasFilters ? "没有找到匹配的任务" : "暂无任务，请点击右上角新增任务开始记录"}
                    actionLabel={hasFilters ? undefined : "新增任务"}
                    actionHref={hasFilters ? undefined : "/tasks/new"}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
