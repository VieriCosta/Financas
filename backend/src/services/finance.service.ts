import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { getFinancialProjection } from "./planning.service.js";

export function buildTransactionWhere(userId: string, filters: Record<string, unknown>) {
  const where: Prisma.TransactionWhereInput = { userId };
  const and: Prisma.TransactionWhereInput[] = [];

  if (filters.type) where.type = filters.type as TransactionType;
  if (filters.categoryId) where.categoryId = String(filters.categoryId);
  if (filters.accountId) where.accountId = String(filters.accountId);
  if (typeof filters.reconciled === "boolean") where.reconciled = filters.reconciled;
  if (filters.tagId) where.tags = { some: { tagId: String(filters.tagId) } };
  if (filters.minAmount != null || filters.maxAmount != null) {
    where.amount = {
      gte: filters.minAmount != null ? Number(filters.minAmount) : undefined,
      lte: filters.maxAmount != null ? Number(filters.maxAmount) : undefined
    };
  }
  if (filters.search) {
    and.push({
      OR: [
        { description: { contains: String(filters.search), mode: "insensitive" } },
        { notes: { contains: String(filters.search), mode: "insensitive" } }
      ]
    });
  }

  if (filters.month || filters.year) {
    const year = Number(filters.year ?? new Date().getUTCFullYear());
    const month = filters.month ? Number(filters.month) : undefined;
    and.push({
      date: {
        gte: new Date(Date.UTC(year, month ? month - 1 : 0, 1)),
        lt: month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1))
      }
    });
  }

  if (filters.from || filters.to) {
    and.push({
      date: {
        gte: filters.from as Date | undefined,
        lte: filters.to as Date | undefined
      }
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export async function getDashboard(userId: string) {
  await ensureRecurringBills(userId);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [transactions, investments, goals, bills, projection, preference] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: "desc" }
    }),
    prisma.investment.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.goal.findMany({ where: { userId }, orderBy: { deadline: "asc" } }),
    prisma.bill.findMany({ where: { userId }, orderBy: { dueDate: "asc" } }),
    getFinancialProjection(userId),
    prisma.dashboardPreference.findUnique({ where: { userId } })
  ]);

  const totals = transactions.reduce(
    (acc, item) => {
      const amount = Number(item.amount);
      if (item.type === "INCOME") acc.income += amount;
      if (item.type === "EXPENSE") acc.expense += amount;
      if (item.date >= monthStart && item.date < nextMonth) {
        if (item.type === "INCOME") acc.monthIncome += amount;
        if (item.type === "EXPENSE") acc.monthExpense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0, monthIncome: 0, monthExpense: 0 }
  );

  const paidBills = bills.filter((bill) => bill.status === "PAID");
  const paidBillsTotal = paidBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  const paidBillsThisMonth = paidBills
    .filter((bill) => (bill.paidAt ?? bill.dueDate) >= monthStart && (bill.paidAt ?? bill.dueDate) < nextMonth)
    .reduce((sum, bill) => sum + Number(bill.amount), 0);

  const investmentTotal = investments.reduce((sum, item) => sum + Number(item.currentValue), 0);
  const balance = projection.currentBalance;

  const chartMonths = preference?.chartMonths ?? 6;
  const monthlySeries = Array.from({ length: chartMonths }).map((_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (chartMonths - 1 - index), 1));
    const monthTransactions = transactions.filter(
      (item) => item.date.getUTCMonth() === date.getUTCMonth() && item.date.getUTCFullYear() === date.getUTCFullYear()
    );
    const monthPaidBills = paidBills
      .filter((bill) => (bill.paidAt ?? bill.dueDate).getUTCMonth() === date.getUTCMonth() && (bill.paidAt ?? bill.dueDate).getUTCFullYear() === date.getUTCFullYear())
      .reduce((sum, bill) => sum + Number(bill.amount), 0);

    return {
      month: date.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }),
      receitas: monthTransactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0),
      despesas: monthTransactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0) + monthPaidBills
    };
  });

  const categorySummary = transactions
    .filter((item) => item.type === "EXPENSE" && item.date >= monthStart && item.date < nextMonth)
    .reduce<Record<string, { value: number; color: string }>>((acc, item) => {
      const key = item.category?.name ?? "Sem categoria";
      acc[key] = {
        value: (acc[key]?.value ?? 0) + Number(item.amount),
        color: item.category?.color ?? "#64748b"
      };
      return acc;
    }, {});

  if (paidBillsThisMonth > 0) {
    categorySummary["Agenda paga"] = {
      value: paidBillsThisMonth,
      color: "#0f766e"
    };
  }

  return {
    cards: {
      balance,
      monthIncome: totals.monthIncome,
      monthExpense: totals.monthExpense + paidBillsThisMonth,
      investments: investmentTotal,
      projectedBalance: projection.projectedBalance
    },
    projection,
    monthlySeries,
    categorySummary: Object.entries(categorySummary).map(([name, item]) => ({ name, value: item.value, color: item.color })),
    goals,
    bills,
    investmentsList: investments,
    recentTransactions: transactions.slice(0, 8)
  };
}

export async function ensureRecurringBills(userId: string, referenceDate = new Date()) {
  return prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  const monthStart = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1));

  const recurringBills = await tx.bill.findMany({
    where: { userId, isRecurring: true, recurrenceDay: { not: null } },
    orderBy: { createdAt: "asc" }
  });

  for (const bill of recurringBills) {
    const recurrenceDay = bill.recurrenceDay ?? bill.dueDate.getUTCDate();
    const lastDay = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0)).getUTCDate();
    const dueDate = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), Math.min(recurrenceDay, lastDay)));
    const exists = await tx.bill.findFirst({
      where: {
        userId,
        title: bill.title,
        isRecurring: true,
        dueDate: { gte: monthStart, lt: nextMonth }
      }
    });

    if (!exists) {
      await tx.bill.create({
        data: {
          title: bill.title,
          amount: bill.amount,
          dueDate,
          status: "PENDING",
          isRecurring: true,
          recurrenceDay,
          reminderAt: bill.reminderAt,
          accountId: bill.accountId,
          userId
        }
      });
    }
  }
  });
}

export function toCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) => {
    const rawText = value == null ? "" : String(value);
    const text = typeof value === "string" && /^[=+\-@\t\r]/.test(rawText) ? `'${rawText}` : rawText;
    return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))
  ].join("\n");
}
