import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { listBudgets } from "./planning.service.js";

export async function audit(userId: string, action: string, resource: string, resourceId?: string, details?: Prisma.InputJsonValue) {
  return prisma.auditLog.create({ data: { userId, action, resource, resourceId, details } });
}

export async function getMonthlyClosing(userId: string, month: number, year: number, persist = false) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const [transactions, budgets, previous] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, date: { gte: start, lt: end } }, include: { category: true } }),
    listBudgets(userId, month, year),
    prisma.monthlyClosing.findUnique({ where: { userId_month_year: { userId, month, year } } })
  ]);
  const income = sumByType(transactions, TransactionType.INCOME);
  const expense = sumByType(transactions, TransactionType.EXPENSE);
  const budgetTotal = budgets.reduce((sum, item) => sum + Number(item.limitAmount), 0);
  const categories = budgets.map((item) => ({ category: item.category.name, limit: Number(item.limitAmount), spent: item.spent, difference: item.remaining }));
  const snapshot = { income, expense, balance: income - expense, budgetTotal, categories };

  if (persist) {
    await prisma.monthlyClosing.upsert({
      where: { userId_month_year: { userId, month, year } },
      create: { userId, month, year, income, expense, budgetTotal, snapshot },
      update: { income, expense, budgetTotal, snapshot }
    });
    await audit(userId, "CLOSE_MONTH", "MONTHLY_CLOSING", `${year}-${month}`);
  }
  return { ...snapshot, saved: persist || Boolean(previous) };
}

export async function getInternalAlerts(userId: string) {
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 3);
  const [bills, budgets, goals, projection] = await Promise.all([
    prisma.bill.findMany({ where: { userId, status: "PENDING", dueDate: { lte: soon } }, orderBy: { dueDate: "asc" } }),
    listBudgets(userId, now.getMonth() + 1, now.getFullYear()),
    prisma.goal.findMany({ where: { userId, deadline: { lt: now } } }),
    import("./planning.service.js").then(({ getFinancialProjection }) => getFinancialProjection(userId))
  ]);
  return [
    ...bills.map((bill) => ({ type: "BILL", tone: bill.dueDate < now ? "danger" : "warning", title: bill.title, message: `Vencimento: ${bill.dueDate.toLocaleDateString("pt-BR")}` })),
    ...budgets.filter((item) => item.percentage >= 80).map((item) => ({ type: "BUDGET", tone: item.percentage > 100 ? "danger" : "warning", title: item.category.name, message: `${Math.round(item.percentage)}% do limite mensal utilizado` })),
    ...goals.map((goal) => ({ type: "GOAL", tone: "warning", title: goal.title, message: "Meta com prazo vencido" })),
    ...(projection.projectedBalance < 0 ? [{ type: "PROJECTION", tone: "danger", title: "Saldo projetado negativo", message: `Projecao em 30 dias: ${projection.projectedBalance.toFixed(2)}` }] : [])
  ];
}

export async function getEmergencyReserve(userId: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const [expenses, reserves] = await Promise.all([
    prisma.transaction.aggregate({ where: { userId, type: "EXPENSE", date: { gte: start, lte: now } }, _sum: { amount: true } }),
    prisma.investment.aggregate({ where: { userId, type: "EMERGENCY_RESERVE" }, _sum: { currentValue: true } })
  ]);
  const averageExpense = Number(expenses._sum.amount ?? 0) / 3;
  const reserve = Number(reserves._sum.currentValue ?? 0);
  return { reserve, averageExpense, coveredMonths: averageExpense ? reserve / averageExpense : 0, recommendedReserve: averageExpense * 6 };
}

export async function saveAttachment(userId: string, transactionId: string, filename: string, mimeType: string, content: Buffer) {
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowed.includes(mimeType)) throw new AppError("Formato de anexo nao permitido. Use PDF, PNG ou JPG.", 400);
  if (!content.length || content.length > 2 * 1024 * 1024) throw new AppError("O anexo deve ter no maximo 2 MB.", 400);
  const transaction = await prisma.transaction.findFirst({ where: { id: transactionId, userId } });
  if (!transaction) throw new AppError("Movimentacao nao encontrada.", 404);
  const attachment = await prisma.attachment.create({ data: { userId, transactionId, filename: filename.slice(0, 160), mimeType, size: content.length, content: new Uint8Array(content) } });
  await audit(userId, "CREATE", "ATTACHMENT", attachment.id);
  return { id: attachment.id, filename: attachment.filename, mimeType: attachment.mimeType, size: attachment.size };
}

export async function getDashboardPreference(userId: string) {
  return prisma.dashboardPreference.upsert({
    where: { userId },
    create: { userId, hiddenWidgets: [], widgetOrder: ["metrics", "charts", "alerts", "bills", "goals"], chartMonths: 6 },
    update: {}
  });
}

function sumByType(items: Array<{ amount: Prisma.Decimal; type: TransactionType }>, type: TransactionType) {
  return items.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.amount), 0);
}
