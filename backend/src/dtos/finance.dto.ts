import { BillStatus, InvestmentType, RecurrenceFrequency, RecurringResourceType, TransactionType } from "@prisma/client";
import { z } from "zod";

export const categoryDto = z.object({
  name: z.string().trim().min(2).max(80),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#2563eb"),
  icon: z.string().trim().min(1).max(40).default("Wallet"),
  type: z.nativeEnum(TransactionType).optional()
});

export const transactionDto = z.object({
  description: z.string().trim().min(2).max(160),
  amount: z.coerce.number().finite().positive(),
  type: z.nativeEnum(TransactionType),
  date: z.coerce.date(),
  categoryId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional()
});

export const updateTransactionDto = transactionDto.partial();

export const billDto = z.object({
  title: z.string().trim().min(2).max(160),
  amount: z.coerce.number().finite().positive(),
  dueDate: z.coerce.date(),
  status: z.nativeEnum(BillStatus).default(BillStatus.PENDING),
  isRecurring: z.coerce.boolean().default(false),
  recurrenceDay: z.coerce.number().min(1).max(31).optional(),
  reminderAt: z.coerce.date().optional()
});

export const updateBillDto = billDto.partial();

export const investmentDto = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.nativeEnum(InvestmentType),
  currentValue: z.coerce.number().finite().nonnegative(),
  investedAmount: z.coerce.number().finite().nonnegative(),
  contribution: z.coerce.number().finite().nonnegative().default(0),
  profitability: z.coerce.number().finite().default(0),
  monthlyYieldRate: z.coerce.number().finite().default(0),
  cdiMonthlyRate: z.coerce.number().finite().default(0),
  cdiPercent: z.coerce.number().finite().default(100),
  ticker: z.string().trim().min(1).max(20).optional(),
  quantity: z.coerce.number().finite().nonnegative().optional(),
  averagePrice: z.coerce.number().finite().nonnegative().optional(),
  broker: z.string().trim().min(1).max(120).optional(),
  institution: z.string().trim().min(1).max(120).optional(),
  indexer: z.string().trim().min(1).max(60).optional(),
  annualRate: z.coerce.number().finite().optional(),
  maturityDate: z.coerce.date().optional(),
  liquidity: z.string().trim().min(1).max(120).optional(),
  custodyLocation: z.string().trim().min(1).max(160).optional(),
  walletAddress: z.string().trim().min(1).max(255).optional(),
  notes: z.string().trim().min(1).max(1000).optional(),
  referenceDate: z.coerce.date().optional()
});

export const updateInvestmentDto = investmentDto.partial().extend({
  addContribution: z.coerce.number().finite().positive().optional()
});

export const goalDto = z.object({
  title: z.string().trim().min(2).max(160),
  targetAmount: z.coerce.number().finite().positive(),
  currentAmount: z.coerce.number().finite().nonnegative().default(0),
  deadline: z.coerce.date().optional()
});

export const updateGoalDto = goalDto.partial().extend({
  addAmount: z.coerce.number().finite().positive().optional()
});

export const financeFiltersDto = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2000).optional(),
  categoryId: z.string().uuid().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional()
  ,minAmount: z.coerce.number().finite().nonnegative().optional()
  ,maxAmount: z.coerce.number().finite().nonnegative().optional()
  ,tagId: z.string().uuid().optional()
});

export const bulkTransactionsDto = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["DELETE", "SET_CATEGORY", "ADD_TAG"]),
  categoryId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional()
});

export const tagDto = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#2563eb")
});

export const dashboardPreferenceDto = z.object({
  hiddenWidgets: z.array(z.string().max(40)).max(20),
  widgetOrder: z.array(z.string().max(40)).max(20),
  chartMonths: z.coerce.number().int().min(3).max(12)
});

export const installmentDto = z.object({
  description: z.string().trim().min(2).max(160),
  totalAmount: z.coerce.number().finite().positive(),
  installments: z.coerce.number().int().min(2).max(120),
  firstDate: z.coerce.date(),
  categoryId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional()
});

export const budgetDto = z.object({
  categoryId: z.string().uuid(),
  limitAmount: z.coerce.number().finite().positive(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200)
});

export const recurringRuleDto = z.object({
  resource: z.nativeEnum(RecurringResourceType),
  title: z.string().trim().min(2).max(160),
  amount: z.coerce.number().finite().positive(),
  transactionType: z.nativeEnum(TransactionType).optional(),
  categoryId: z.string().uuid().optional(),
  frequency: z.nativeEnum(RecurrenceFrequency),
  interval: z.coerce.number().int().min(1).max(120).default(1),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  nextRunAt: z.coerce.date(),
  active: z.coerce.boolean().default(true)
}).superRefine((value, context) => {
  if (value.resource === RecurringResourceType.TRANSACTION && !value.transactionType) {
    context.addIssue({ code: "custom", path: ["transactionType"], message: "Informe o tipo da movimentacao recorrente." });
  }
});
