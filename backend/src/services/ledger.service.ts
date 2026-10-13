import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { addMonths } from "./planning.service.js";

export async function ensureAccount(userId: string, id?: string | null, db: Prisma.TransactionClient = prisma) {
  if (!id) return;
  const account = await db.account.findFirst({ where: { id, userId, archived: false } });
  if (!account) throw new AppError("Conta invalida ou arquivada.", 400);
  return account;
}

export function purchaseSchedule(date: Date, closingDay: number, totalAmount: number, installments: number) {
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + (date.getUTCDate() >= closingDay ? 1 : 0), 1));
  const cents = Math.round(totalAmount * 100);
  const base = Math.floor(cents / installments);
  if (base < 1) throw new AppError("O valor deve permitir parcelas de pelo menos um centavo.", 400);
  return Array.from({ length: installments }, (_, index) => ({
    invoiceMonth: addMonths(first, index).toISOString().slice(0, 7),
    date: index === 0 ? date : addMonths(date, index),
    amount: (index === installments - 1 ? cents - base * index : base) / 100
  }));
}

export function invoiceDueDate(month: string, closingDay: number, dueDay: number) {
  const [year, index] = month.split("-").map(Number);
  const dueMonth = index - 1 + (dueDay <= closingDay ? 1 : 0);
  const last = new Date(Date.UTC(year, dueMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, dueMonth, Math.min(dueDay, last)));
}

export async function listAccounts(userId: string) {
  const now = new Date();
  const [accounts, transactions, transfers, payments, bills] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ where: { userId, date: { lte: now }, accountId: { not: null }, creditCardId: null } }),
    prisma.transfer.findMany({ where: { userId, date: { lte: now } } }),
    prisma.cardPayment.findMany({ where: { userId, date: { lte: now } } }),
    prisma.bill.findMany({ where: { userId, status: "PAID", accountId: { not: null } } })
  ]);
  return accounts.map(account => {
    let balance = new Prisma.Decimal(account.openingBalance);
    for (const item of transactions.filter(item => item.accountId === account.id)) balance = item.type === "INCOME" ? balance.plus(item.amount) : balance.minus(item.amount);
    for (const item of transfers) { if (item.fromAccountId === account.id) balance = balance.minus(item.amount); if (item.toAccountId === account.id) balance = balance.plus(item.amount); }
    for (const item of payments.filter(item => item.accountId === account.id)) balance = balance.minus(item.amount);
    for (const item of bills.filter(item => item.accountId === account.id)) balance = balance.minus(item.amount);
    return { ...account, balance: balance.toNumber() };
  });
}

export async function createCardPurchase(userId: string, cardId: string, input: { description: string; totalAmount: number; installments: number; date: Date; categoryId?: string }) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "CreditCard" WHERE id = ${cardId} AND "userId" = ${userId} FOR UPDATE`;
    const card = await tx.creditCard.findFirst({ where: { id: cardId, userId, archived: false } });
    if (!card) throw new AppError("Cartao invalido ou arquivado.", 404);
    if (input.categoryId && !await tx.category.findFirst({ where: { id: input.categoryId, userId, archived: false, OR: [{ type: null }, { type: "EXPENSE" }] } })) throw new AppError("Categoria invalida.", 400);
    const [spent, paid] = await Promise.all([
      tx.transaction.aggregate({ where: { userId, creditCardId: cardId }, _sum: { amount: true } }),
      tx.cardPayment.aggregate({ where: { userId, creditCardId: cardId }, _sum: { amount: true } })
    ]);
    const outstanding = new Prisma.Decimal(spent._sum.amount ?? 0).minus(paid._sum.amount ?? 0);
    if (outstanding.plus(input.totalAmount).greaterThan(card.limitAmount)) throw new AppError("A compra ultrapassa o limite disponivel do cartao.", 400);
    const schedule = purchaseSchedule(input.date, card.closingDay, input.totalAmount, input.installments);
    const groupId = randomUUID();
    for (const [index, item] of schedule.entries()) {
      if (await tx.cardPayment.count({ where: { userId, creditCardId: cardId, invoiceMonth: item.invoiceMonth } })) throw new AppError("Esta fatura ja recebeu pagamento. Use uma data de compra em uma fatura aberta.", 400);
      await tx.transaction.create({ data: { userId, description: input.installments > 1 ? `${input.description} (${index + 1}/${input.installments})` : input.description, type: "EXPENSE", amount: item.amount, date: item.date, invoiceMonth: item.invoiceMonth, creditCardId: cardId, categoryId: input.categoryId, installmentGroupId: groupId, installmentNumber: index + 1, installmentTotal: input.installments } });
    }
    return { count: schedule.length };
  });
}

export async function cardInvoices(userId: string, cardId: string) {
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new AppError("Cartao nao encontrado.", 404);
  const [transactions, payments] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, creditCardId: cardId }, orderBy: { date: "asc" } }),
    prisma.cardPayment.findMany({ where: { userId, creditCardId: cardId } })
  ]);
  const months = [...new Set(transactions.map(item => item.invoiceMonth!))].sort();
  return months.map(month => {
    const items = transactions.filter(item => item.invoiceMonth === month);
    const total = items.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));
    const paid = payments.filter(item => item.invoiceMonth === month).reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));
    return { month, total: total.toNumber(), paid: paid.toNumber(), remaining: total.minus(paid).toNumber(), dueDate: invoiceDueDate(month, card.closingDay, card.dueDay), items };
  });
}

export async function payInvoice(userId: string, cardId: string, input: { accountId: string; invoiceMonth: string; amount: number; date: Date }) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "CreditCard" WHERE id = ${cardId} AND "userId" = ${userId} FOR UPDATE`;
    if (!await tx.creditCard.findFirst({ where: { id: cardId, userId } })) throw new AppError("Cartao nao encontrado.", 404);
    await ensureAccount(userId, input.accountId, tx);
    const [expenses, payments] = await Promise.all([
      tx.transaction.aggregate({ where: { userId, creditCardId: cardId, invoiceMonth: input.invoiceMonth }, _sum: { amount: true } }),
      tx.cardPayment.aggregate({ where: { userId, creditCardId: cardId, invoiceMonth: input.invoiceMonth }, _sum: { amount: true } })
    ]);
    const remaining = new Prisma.Decimal(expenses._sum.amount ?? 0).minus(payments._sum.amount ?? 0);
    if (remaining.lessThan(input.amount)) throw new AppError("O pagamento ultrapassa o saldo da fatura.", 400);
    return tx.cardPayment.create({ data: { ...input, userId, creditCardId: cardId } });
  });
}
