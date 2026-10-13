export type TransactionType = "INCOME" | "EXPENSE";
export type BillStatus = "PENDING" | "PAID";
export type InvestmentType = "STOCK" | "CRYPTO" | "FIXED_INCOME" | "EMERGENCY_RESERVE" | "OTHER";
export type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  type?: TransactionType;
  archived?: boolean;
};

export type Transaction = {
  id: string;
  description: string;
  amount: string | number;
  type: TransactionType;
  date: string;
  notes?: string;
  accountId?: string;
  creditCardId?: string;
  reconciled?: boolean;
  categoryId?: string;
  category?: Category;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  tags?: Array<{ tag: Tag }>;
  attachments?: Attachment[];
};

export type Tag = { id: string; name: string; color: string; archived?: boolean };
export type Attachment = { id: string; filename: string; mimeType: string; size: number };
export type InternalAlert = { type: string; tone: "danger" | "warning"; title: string; message: string };
export type EmergencyReserve = { reserve: number; averageExpense: number; coveredMonths: number; recommendedReserve: number };
export type DashboardPreference = { hiddenWidgets: string[]; widgetOrder: string[]; chartMonths: number };
export type MonthlyClosing = { income: number; expense: number; balance: number; budgetTotal: number; saved: boolean; categories: Array<{ category: string; limit: number; spent: number; difference: number }> };

export type Budget = {
  id: string;
  categoryId: string;
  category: Category;
  limitAmount: string | number;
  spent: number;
  remaining: number;
  percentage: number;
  month: number;
  year: number;
};

export type RecurringRule = {
  id: string;
  resource: "TRANSACTION" | "BILL";
  title: string;
  amount: string | number;
  transactionType?: TransactionType;
  frequency: RecurrenceFrequency;
  interval: number;
  nextRunAt: string;
  active: boolean;
};

export type Bill = {
  id: string;
  title: string;
  amount: string | number;
  dueDate: string;
  status: BillStatus;
  isRecurring?: boolean;
  recurrenceDay?: number;
};

export type Investment = {
  id: string;
  name: string;
  type: InvestmentType;
  currentValue: string | number;
  investedAmount: string | number;
  contribution: string | number;
  profitability: string | number;
  monthlyYieldRate?: string | number;
  cdiMonthlyRate?: string | number;
  cdiPercent?: string | number;
  ticker?: string;
  quantity?: string | number;
  averagePrice?: string | number;
  broker?: string;
  institution?: string;
  indexer?: string;
  annualRate?: string | number;
  maturityDate?: string;
  liquidity?: string;
  custodyLocation?: string;
  walletAddress?: string;
  notes?: string;
  referenceDate?: string;
};

export type Goal = {
  id: string;
  title: string;
  targetAmount: string | number;
  currentAmount: string | number;
  deadline?: string;
};

export type DashboardData = {
  cards: {
    balance: number;
    monthIncome: number;
    monthExpense: number;
    investments: number;
    projectedBalance: number;
  };
  projection: {
    currentBalance: number;
    projectedBalance: number;
    scheduledBalance: number;
    pendingBillTotal: number;
    periodDays: number;
  };
  monthlySeries: Array<{ month: string; receitas: number; despesas: number }>;
  categorySummary: Array<{ name: string; value: number; color?: string }>;
  goals: Goal[];
  bills: Bill[];
  investmentsList: Investment[];
  recentTransactions: Transaction[];
};

export type PaginatedTransactions = {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
