import { randomUUID } from "node:crypto";
import { Prisma, RecurrenceFrequency, RecurringResourceType, TransactionType, Transaction } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { sendBillReminderEmail } from "./mail.service.js";

type DatabaseClient = typeof prisma | Prisma.TransactionClient;

type InstallmentInput = {
  description: string;
  totalAmount: number;
  installments: number;
  firstDate: Date;
  categoryId?: string;
  notes?: string;
};

export async function createInstallments(userId: string, input: InstallmentInput, db: DatabaseClient = prisma): Promise<Transaction[]> {
  if (db === prisma) return prisma.$transaction((tx) => createInstallments(userId, input, tx));
  await ensureCategory(userId, input.categoryId, TransactionType.EXPENSE, db);
  const installmentGroupId = randomUUID();
  const totalInCents = Math.round(input.totalAmount * 100);
  const baseInCents = Math.floor(totalInCents / input.installments);
  const transactions = [];

  for (let index = 0; index < input.installments; index += 1) {
    const date = addMonths(input.firstDate, index);
    const amountInCents = index === input.installments - 1
      ? totalInCents - baseInCents * (input.installments - 1)
      : baseInCents;

    transactions.push(await db.transaction.create({
      data: {
        userId,
        description: `${input.description} (${index + 1}/${input.installments})`,
        amount: amountInCents / 100,
        type: TransactionType.EXPENSE,
        date,
        categoryId: input.categoryId,
        notes: input.notes,
        installmentGroupId,
        installmentNumber: index + 1,
        installmentTotal: input.installments
      }
    }));
  }

  return transactions;
}

export async function listBudgets(userId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const budgets = await prisma.budget.findMany({
    where: { userId, month, year },
    include: { category: true },
    orderBy: { category: { name: "asc" } }
  });
  const spent = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: TransactionType.EXPENSE, date: { gte: start, lt: end }, categoryId: { not: null } },
    _sum: { amount: true }
  });
  const spentByCategory = new Map(spent.map((item) => [item.categoryId, Number(item._sum.amount ?? 0)]));

  return budgets.map((budget) => {
    const actual = spentByCategory.get(budget.categoryId) ?? 0;
    const limit = Number(budget.limitAmount);
    return { ...budget, spent: actual, remaining: limit - actual, percentage: limit ? (actual / limit) * 100 : 0 };
  });
}

export async function upsertBudget(userId: string, input: { categoryId: string; limitAmount: number; month: number; year: number }) {
  await ensureCategory(userId, input.categoryId, TransactionType.EXPENSE);
  return prisma.budget.upsert({
    where: { userId_categoryId_month_year: { userId, categoryId: input.categoryId, month: input.month, year: input.year } },
    create: { ...input, userId },
    update: { limitAmount: input.limitAmount }
  });
}

export async function listRecurringRules(userId: string) {
  await ensureRecurringEntries(userId);
  return prisma.recurringRule.findMany({ where: { userId }, include: { category: true }, orderBy: { nextRunAt: "asc" } });
}

export async function ensureRecurringEntries(userId?: string) {
  const now = new Date();
  const rules = await prisma.recurringRule.findMany({
    where: { userId, active: true, nextRunAt: { lte: now } }
  });

  for (const rule of rules) {
    await prisma.$transaction(async (tx) => {
    // A row lock serializes generation across HTTP requests and scheduler runs.
    await tx.$queryRaw`SELECT id FROM "RecurringRule" WHERE id = ${rule.id} FOR UPDATE`;
    const current = await tx.recurringRule.findUnique({ where: { id: rule.id } });
    if (!current?.active || current.nextRunAt > now) return;
    let nextRunAt = current.nextRunAt;
    let generated = 0;

    while (nextRunAt <= now && generated < 36) {
      if (rule.resource === RecurringResourceType.TRANSACTION) {
        await tx.transaction.create({
          data: {
            userId: rule.userId,
            description: rule.title,
            amount: rule.amount,
            type: rule.transactionType ?? TransactionType.EXPENSE,
            categoryId: rule.categoryId,
            date: nextRunAt
          }
        });
      } else {
        await tx.bill.create({
          data: { userId: rule.userId, title: rule.title, amount: rule.amount, dueDate: nextRunAt }
        });
      }

      nextRunAt = addFrequency(nextRunAt, rule.frequency, rule.interval);
      generated += 1;
    }

    await tx.recurringRule.update({ where: { id: rule.id }, data: { nextRunAt } });
    });
  }
}

export async function getFinancialProjection(userId: string) {
  await ensureRecurringEntries(userId);
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 30);
  const [pastTransactions, scheduledTransactions, pendingBills] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, date: { lte: now } }, select: { amount: true, type: true } }),
    prisma.transaction.findMany({ where: { userId, date: { gt: now, lte: end } }, select: { amount: true, type: true } }),
    prisma.bill.findMany({ where: { userId, status: "PENDING", dueDate: { lte: end } }, select: { amount: true } })
  ]);
  const currentBalance = sumTransactions(pastTransactions);
  const scheduledBalance = sumTransactions(scheduledTransactions);
  const pendingBillTotal = pendingBills.reduce((total, bill) => total + Number(bill.amount), 0);

  return {
    currentBalance,
    projectedBalance: currentBalance + scheduledBalance - pendingBillTotal,
    scheduledBalance,
    pendingBillTotal,
    periodDays: 30
  };
}

export async function sendDueBillNotifications() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const bills = await prisma.bill.findMany({
    where: {
      status: "PENDING",
      notifiedAt: null,
      OR: [{ reminderAt: { lte: now } }, { reminderAt: null, dueDate: { lte: tomorrow } }]
    },
    include: { user: true }
  });

  for (const bill of bills) {
    const result = await sendBillReminderEmail({
      to: bill.user.email,
      title: bill.title,
      amount: Number(bill.amount),
      dueDate: bill.dueDate
    });
    if (result.sent) await prisma.bill.update({ where: { id: bill.id }, data: { notifiedAt: now } });
  }

  return bills.length;
}

function sumTransactions(items: Array<{ amount: Prisma.Decimal; type: TransactionType }>) {
  return items.reduce((total, item) => total + (item.type === TransactionType.INCOME ? Number(item.amount) : -Number(item.amount)), 0);
}

export function addFrequency(date: Date, frequency: RecurrenceFrequency, interval: number) {
  if (frequency === RecurrenceFrequency.WEEKLY) {
    const next = new Date(date);
    next.setDate(next.getDate() + 7 * interval);
    return next;
  }
  if (frequency === RecurrenceFrequency.YEARLY) {
    return addMonths(date, interval * 12);
  }
  return addMonths(date, interval);
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

async function ensureCategory(userId: string, categoryId: string | undefined, type: TransactionType, db: DatabaseClient = prisma) {
  if (!categoryId) return;
  const category = await db.category.findFirst({ where: { id: categoryId, userId } });
  if (!category || (category.type && category.type !== type)) throw new AppError("Categoria invalida para esta movimentacao.", 400);
}
