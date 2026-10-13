import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { buildTransactionWhere } from "./finance.service.js";
import { financeFiltersDto } from "../dtos/finance.dto.js";

export const reportDto = financeFiltersDto.and(z.object({ from: z.coerce.date(), to: z.coerce.date() })).refine(value => value.to.getTime() - value.from.getTime() <= 3660 * 86400000, "Escolha um periodo de ate dez anos.");
export async function financialReport(userId: string, filters: z.infer<typeof reportDto>) {
  const duration = filters.to.getTime() - filters.from.getTime() + 1;
  const previousTo = new Date(filters.from.getTime() - 1);
  const previousFrom = new Date(filters.from.getTime() - duration);
  const where = buildTransactionWhere(userId, { ...filters, month: undefined, year: undefined });
  const previousWhere = buildTransactionWhere(userId, { ...filters, month: undefined, year: undefined, from: previousFrom, to: previousTo });
  const [items, previous, bills] = await Promise.all([
    prisma.transaction.findMany({ where, include: { category: true }, orderBy: { date: "asc" } }),
    prisma.transaction.groupBy({ by: ["type"], where: previousWhere, _sum: { amount: true } }),
    prisma.bill.aggregate({ where: { userId, status: "PAID", OR: [{ paidAt: { gte: filters.from, lte: filters.to } }, { paidAt: null, dueDate: { gte: filters.from, lte: filters.to } }] }, _sum: { amount: true } })
  ]);
  const income = items.filter(item => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = items.filter(item => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0);
  const categories = new Map<string, { name: string; income: number; expense: number }>();
  const months = new Map<string, { month: string; income: number; expense: number }>();
  for (const item of items) {
    const name = item.category?.name ?? "Sem categoria";
    const category = categories.get(name) ?? { name, income: 0, expense: 0 };
    const month = item.date.toISOString().slice(0, 7);
    const series = months.get(month) ?? { month, income: 0, expense: 0 };
    const key = item.type === "INCOME" ? "income" : "expense";
    category[key] += Number(item.amount); series[key] += Number(item.amount);
    categories.set(name, category); months.set(month, series);
  }
  const previousIncome = Number(previous.find(item => item.type === "INCOME")?._sum.amount ?? 0);
  const previousExpense = Number(previous.find(item => item.type === "EXPENSE")?._sum.amount ?? 0);
  return { from: filters.from, to: filters.to, count: items.length, income, expense, balance: income - expense, paidBills: Number(bills._sum.amount ?? 0), previous: { from: previousFrom, to: previousTo, income: previousIncome, expense: previousExpense, balance: previousIncome - previousExpense }, categories: [...categories.values()].sort((a, b) => b.expense - a.expense), months: [...months.values()] };
}
