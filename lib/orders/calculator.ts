import prisma from "@/lib/prisma";

export async function recalculateOrder(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, orderCharges: true, invoices: { include: { payments: true } } },
  });

  if (!order) return null;

  // Calculate items
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalCost = 0;

  for (const item of order.items) {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unitPrice || 0);
    const itemSubtotal = qty * price;
    subtotal += itemSubtotal;

    const discType = item.discountType;
    const discVal = Number(item.discountValue || 0);
    let discAmt = 0;
    if (discType === "PERCENTAGE") {
      discAmt = itemSubtotal * (discVal / 100);
    } else {
      discAmt = discVal;
    }
    totalDiscount += discAmt;

    const taxable = itemSubtotal - discAmt;
    const taxRate = Number(item.taxRate || 0);
    const taxAmt = taxable * (taxRate / 100);
    totalTax += taxAmt;

    const cost = Number(item.costPrice || 0) * qty;
    totalCost += cost;
  }

  // Calculate charges
  let chargeAmount = 0;
  for (const charge of order.orderCharges) {
    chargeAmount += Number(charge.amount || 0);
    if (charge.taxable) {
      chargeAmount += Number(charge.taxAmount || 0);
    }
  }

  const totalAmount = subtotal - totalDiscount + totalTax + chargeAmount;

  // Calculate payments
  let paidAmount = 0;
  for (const invoice of order.invoices) {
    for (const payment of invoice.payments) {
      paidAmount += Number(payment.amount || 0);
    }
  }

  const outstandingAmount = Math.max(0, Number(totalAmount) - paidAmount);
  const grossProfitAmount = Number(totalAmount) - totalCost;
  const grossProfitRate = Number(totalAmount) > 0 ? (grossProfitAmount / Number(totalAmount)) * 100 : 0;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal: subtotal,
      discountAmount: totalDiscount,
      taxAmount: totalTax,
      chargeAmount: chargeAmount,
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      outstandingAmount: outstandingAmount,
      costAmount: totalCost,
      grossProfitAmount: grossProfitAmount,
      grossProfitRate: Math.round(grossProfitRate * 100) / 100,
    },
  });

  return { subtotal, totalDiscount, totalTax, chargeAmount, totalAmount, paidAmount, outstandingAmount, totalCost, grossProfitAmount, grossProfitRate };
}
