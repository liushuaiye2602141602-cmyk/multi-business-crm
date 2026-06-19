import prisma from "@/lib/prisma";
import { getSegmentByKey, type PresetSegment } from "./preset-segments";

export async function getSegmentCount(segment: PresetSegment, settings: Record<string, string>): Promise<number> {
  const where = segment.buildWhere(settings);

  if (segment.requiresQuoteFilter) {
    // quoted_not_won: customers with valid quotes but no won orders
    const customerIds = await prisma.quote.findMany({
      where: {
        status: { in: ["SENT", "WAITING_FEEDBACK", "REVISED", "ACCEPTED"] },
        customer: { isArchived: false, stage: { notIn: ["LOST", "WON"] } },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const wonOrderCustomerIds = await prisma.order.findMany({
      where: { orderStatus: { in: ["CONFIRMED", "PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED"] } },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const wonSet = new Set(wonOrderCustomerIds.map(o => o.customerId).filter((id): id is number => id !== null));
    const filtered = customerIds.filter(c => c.customerId !== null && !wonSet.has(c.customerId));
    return filtered.length;
  }

  if (segment.requiresOrderFilter) {
    // won_customers: stage=WON or has valid orders
    const orderCustomerIds = await prisma.order.findMany({
      where: { orderStatus: { in: ["CONFIRMED", "PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED"] } },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const wonStage = await prisma.customer.count({
      where: { ...where, stage: "WON" },
    });

    const withOrders = new Set(orderCustomerIds.map(o => o.customerId).filter((id): id is number => id !== null)).size;
    // Deduplicate: some customers might have both stage=WON and orders
    return Math.max(wonStage, withOrders);
  }

  return prisma.customer.count({ where });
}

export async function getSegmentCustomers(
  segment: PresetSegment,
  settings: Record<string, string>,
  options: { page?: number; pageSize?: number; select?: any; include?: any; orderBy?: any } = {}
) {
  const where = segment.buildWhere(settings);
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;

  if (segment.requiresQuoteFilter) {
    const customerIds = await prisma.quote.findMany({
      where: {
        status: { in: ["SENT", "WAITING_FEEDBACK", "REVISED", "ACCEPTED"] },
        customer: { isArchived: false, stage: { notIn: ["LOST", "WON"] } },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const wonOrderCustomerIds = await prisma.order.findMany({
      where: { orderStatus: { in: ["CONFIRMED", "PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED"] } },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const wonSet = new Set(wonOrderCustomerIds.map(o => o.customerId).filter((id): id is number => id !== null));
    const validIds = customerIds.filter(c => c.customerId !== null && !wonSet.has(c.customerId)).map(c => c.customerId as number);

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: { id: { in: validIds } },
        ...(options.select ? { select: options.select } : {}),
        ...(options.include ? { include: options.include } : {}),
        orderBy: options.orderBy || { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      Promise.resolve(validIds.length),
    ]);

    return { customers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  if (segment.requiresOrderFilter) {
    const orderCustomerIds = await prisma.order.findMany({
      where: { orderStatus: { in: ["CONFIRMED", "PRODUCTION", "READY_TO_SHIP", "SHIPPED", "COMPLETED"] } },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const orderCustomerIdSet = new Set(orderCustomerIds.map(o => o.customerId).filter((id): id is number => id !== null));
    const wonStageWhere = { ...where, stage: "WON" };
    const orderWhere = { id: { in: Array.from(orderCustomerIdSet) }, ...where };

    const [wonCustomers, orderCustomers, wonCount, orderCount] = await Promise.all([
      prisma.customer.findMany({
        where: wonStageWhere,
        ...(options.include ? { include: options.include } : {}),
        orderBy: options.orderBy || { updatedAt: "desc" },
      }),
      prisma.customer.findMany({
        where: orderWhere,
        ...(options.include ? { include: options.include } : {}),
        orderBy: options.orderBy || { updatedAt: "desc" },
      }),
      prisma.customer.count({ where: wonStageWhere }),
      orderCustomerIdSet.size > 0 ? prisma.customer.count({ where: orderWhere }) : Promise.resolve(0),
    ]);

    // Merge and deduplicate
    const merged = new Map<number, any>();
    for (const c of [...wonCustomers, ...orderCustomers]) {
      merged.set(c.id, c);
    }
    const allCustomers = Array.from(merged.values());
    const total = Math.max(wonCount, orderCount);

    // Apply pagination on merged results
    const start = (page - 1) * pageSize;
    const paginatedCustomers = allCustomers.slice(start, start + pageSize);

    return { customers: paginatedCustomers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      ...(options.select ? { select: options.select } : {}),
      ...(options.include ? { include: options.include } : {}),
      orderBy: options.orderBy || { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
