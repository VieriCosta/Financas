import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export function buildTransactionWhere(userId: string, filters: Record<string, unknown>) {
  const where: Prisma.TransactionWhereInput = { userId };
  const and: Prisma.TransactionWhereInput[] = [];

  if (filters.type) where.type = filters.type as TransactionType;
  if (filters.categoryId) where.categoryId = String(filters.categoryId);
  if (filters.search) {
    and.push({
      OR: [
        { description: { contains: String(filters.search), mode: "insensitive" } },
        { notes: { contains: String(filters.search), mode: "insensitive" } }
      ]
    });
  }

  if (filters.month || filters.year) {
    const year = Number(filters.year ?? new Date().getFullYear());
    const month = Number(filters.month ?? new Date().getMonth() + 1);
    and.push({
      date: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1)
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [transactions, investments, goals, bills] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: "desc" }
    }),
    prisma.investment.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.goal.findMany({ where: { userId }, orderBy: { deadline: "asc" } }),
    prisma.bill.findMany({ where: { userId }, orderBy: { dueDate: "asc" } })
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
    .filter((bill) => bill.dueDate >= monthStart && bill.dueDate < nextMonth)
    .reduce((sum, bill) => sum + Number(bill.amount), 0);

  const investmentTotal = investments.reduce((sum, item) => sum + Number(item.currentValue), 0);
  const balance = totals.income - totals.expense - paidBillsTotal + investmentTotal;

  const monthlySeries = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthTransactions = transactions.filter(
      (item) => item.date.getMonth() === date.getMonth() && item.date.getFullYear() === date.getFullYear()
    );
    const monthPaidBills = paidBills
      .filter((bill) => bill.dueDate.getMonth() === date.getMonth() && bill.dueDate.getFullYear() === date.getFullYear())
      .reduce((sum, bill) => sum + Number(bill.amount), 0);

    return {
      month: date.toLocaleDateString("pt-BR", { month: "short" }),
      receitas: monthTransactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0),
      despesas: monthTransactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0) + monthPaidBills
    };
  });

  const categorySummary = transactions
    .filter((item) => item.type === "EXPENSE")
    .reduce<Record<string, { value: number; color: string }>>((acc, item) => {
      const key = item.category?.name ?? "Sem categoria";
      acc[key] = {
        value: (acc[key]?.value ?? 0) + Number(item.amount),
        color: item.category?.color ?? "#64748b"
      };
      return acc;
    }, {});

  if (paidBillsTotal > 0) {
    categorySummary["Agenda paga"] = {
      value: paidBillsTotal,
      color: "#0f766e"
    };
  }

  return {
    cards: {
      balance,
      monthIncome: totals.monthIncome,
      monthExpense: totals.monthExpense + paidBillsThisMonth,
      investments: investmentTotal
    },
    monthlySeries,
    categorySummary: Object.entries(categorySummary).map(([name, item]) => ({ name, value: item.value, color: item.color })),
    goals,
    bills,
    investmentsList: investments,
    recentTransactions: transactions.slice(0, 8)
  };
}

export async function ensureRecurringBills(userId: string, referenceDate = new Date()) {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);

  const recurringBills = await prisma.bill.findMany({
    where: { userId, isRecurring: true, recurrenceDay: { not: null } },
    orderBy: { createdAt: "asc" }
  });

  for (const bill of recurringBills) {
    const recurrenceDay = bill.recurrenceDay ?? bill.dueDate.getDate();
    const dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), Math.min(recurrenceDay, 28));
    const exists = await prisma.bill.findFirst({
      where: {
        userId,
        title: bill.title,
        isRecurring: true,
        dueDate: { gte: monthStart, lt: nextMonth }
      }
    });

    if (!exists) {
      await prisma.bill.create({
        data: {
          title: bill.title,
          amount: bill.amount,
          dueDate,
          status: "PENDING",
          isRecurring: true,
          recurrenceDay,
          reminderAt: bill.reminderAt,
          userId
        }
      });
    }
  }
}

export function toCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))
  ].join("\n");
}
