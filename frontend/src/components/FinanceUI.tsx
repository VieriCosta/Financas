import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import axios from "axios";

import { CheckCircle2, CircleAlert, Trash2 } from "lucide-react";

import {
  Category,
  DashboardData,
  Investment,
  PaginatedTransactions,
  Tag,
  Transaction,
} from "../types/finance";
import { money } from "../utils/format";
import { Toast, TransactionFilters } from "../types/dashboard";

export const investmentTypeOptions: Array<[Investment["type"], string]> = [
  ["FIXED_INCOME", "Renda fixa"],
  ["EMERGENCY_RESERVE", "Reserva"],
  ["STOCK", "Acoes"],
  ["CRYPTO", "Criptomoedas"],
  ["OTHER", "Outro"],
];

export function readInvestmentPayload(form: FormData) {
  return {
    currentValue: numberFromForm(form, "currentValue"),
    investedAmount: numberFromForm(form, "investedAmount"),
    contribution: numberFromForm(form, "contribution", 0),
    profitability: numberFromForm(form, "profitability", 0),
    monthlyYieldRate: numberFromForm(form, "monthlyYieldRate", 0),
    cdiMonthlyRate: numberFromForm(form, "cdiMonthlyRate", 0),
    cdiPercent: numberFromForm(form, "cdiPercent", 100),
    ticker: textFromForm(form, "ticker"),
    quantity: optionalNumberFromForm(form, "quantity"),
    averagePrice: optionalNumberFromForm(form, "averagePrice"),
    broker: textFromForm(form, "broker"),
    institution: textFromForm(form, "institution"),
    indexer: textFromForm(form, "indexer"),
    annualRate: optionalNumberFromForm(form, "annualRate"),
    maturityDate: textFromForm(form, "maturityDate"),
    liquidity: textFromForm(form, "liquidity"),
    custodyLocation: textFromForm(form, "custodyLocation"),
    walletAddress: textFromForm(form, "walletAddress"),
    notes: textFromForm(form, "notes"),
  };
}

export function investmentNamePlaceholder(type: Investment["type"]) {
  const placeholders: Record<Investment["type"], string> = {
    STOCK: "Nome da ação ou FII",
    CRYPTO: "Nome da criptomoeda",
    FIXED_INCOME: "Nome do titulo",
    EMERGENCY_RESERVE: "Nome da reserva",
    OTHER: "Nome do investimento",
  };

  return placeholders[type];
}

export function numberFromForm(
  form: FormData,
  name: string,
  fallback?: number,
) {
  const value = form.get(name);
  if (value === null || value === "") return fallback ?? 0;
  return Number(value);
}

export function optionalNumberFromForm(form: FormData, name: string) {
  const value = form.get(name);
  return value === null || value === "" ? undefined : Number(value);
}

export function textFromForm(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  return value || undefined;
}

export function numberDefault(value: string | number | undefined) {
  return value === undefined || value === null ? "" : Number(value);
}

export type AiCommandPreview = {
  ready: boolean;
  summary: string;
  clarification: string | null;
  confirmationToken: string | null;
  actions: Array<Record<string, unknown>>;
};

export type AiHistoryItem = {
  id: string;
  kind: "ADVICE" | "COMMAND" | "REPORT";
  status: "ANSWERED" | "PENDING" | "CONFIRMED";
  request: string;
  response: string;
  createdAt: string;
};

export function aiResourceLabel(resource: string) {
  return (
    {
      TRANSACTION: "Movimentação",
      BILL: "Conta na agenda",
      INVESTMENT: "Investimento",
      GOAL: "Meta financeira",
    }[resource] ?? "Cadastro financeiro"
  );
}

export function Metric({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "blue" | "green" | "red" | "slate";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    green:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    red: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
  return (
    <article
      className={`metric-card metric-${tone} animate-rise rounded-xl p-5`}
    >
      <div
        className={`mb-6 grid h-11 w-11 place-items-center rounded-lg ${tones[tone]}`}
      >
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <strong className="mt-2 block text-2xl font-semibold">{value}</strong>
    </article>
  );
}

export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-panel animate-rise rounded-xl p-5">
      <h2 className="panel-title mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ToastMessage({ toast }: { toast: Exclude<Toast, null> }) {
  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 w-[calc(100vw-2rem)] max-w-sm animate-rise rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <span
          className={
            isSuccess
              ? "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
          }
        >
          {isSuccess ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
        </span>
        <div>
          <p className="font-semibold">
            {isSuccess ? "Ação concluida" : "Algo deu errado"}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
    >
      <Trash2 size={16} />
    </button>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-400">
      {text}
    </div>
  );
}

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginatedTransactions;
  onPageChange: (page: number) => Promise<void>;
}) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">
        Página {pagination.page} de {pagination.totalPages} - {pagination.total}{" "}
        registros
      </span>
      <div className="flex gap-2">
        <button
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800"
        >
          Anterior
        </button>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

export function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

export function SubmitButton({
  disabled,
  children,
}: {
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      className="flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {disabled ? "Salvando..." : children}
    </button>
  );
}

export function transactionParams(
  filters: TransactionFilters,
  page: number,
  requestId?: number,
) {
  return {
    month: filters.month || undefined,
    year: filters.year || undefined,
    type: filters.type || undefined,
    search: filters.search.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    tagId: filters.tagId || undefined,
    accountId: filters.accountId || undefined,
    reconciled: filters.reconciled || undefined,
    minAmount: filters.minAmount || undefined,
    maxAmount: filters.maxAmount || undefined,
    page,
    pageSize: 10,
    _t: requestId,
  };
}

export function categoryMatchesTransactionType(
  category: Category,
  type: Transaction["type"],
) {
  if (type === "INCOME") return category.type !== "EXPENSE";
  return category.type !== "INCOME";
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data.message ?? fallback;
  }

  return fallback;
}

export function getEffectiveMonthlyRate(investment: Investment) {
  const cdiMonthlyRate = Number(investment.cdiMonthlyRate ?? 0);
  const cdiPercent = Number(investment.cdiPercent ?? 100);
  const manualRate = Number(investment.monthlyYieldRate ?? 0);

  if (cdiMonthlyRate > 0) {
    return cdiMonthlyRate * (cdiPercent / 100);
  }

  return manualRate;
}

export function estimateMonthlyReturn(investment: Investment) {
  return (
    Number(investment.currentValue) *
    (getEffectiveMonthlyRate(investment) / 100)
  );
}

export function investmentTypeLabel(type: Investment["type"]) {
  const labels: Record<Investment["type"], string> = {
    STOCK: "Acoes",
    CRYPTO: "Criptomoedas",
    FIXED_INCOME: "Renda fixa",
    EMERGENCY_RESERVE: "Reserva",
    OTHER: "Outro",
  };

  return labels[type];
}

export function buildFinancialAdvice(dashboard: DashboardData) {
  const income = dashboard.cards.monthIncome;
  const expenses = dashboard.cards.monthExpense;
  const investments = dashboard.cards.investments;
  const pendingBills = dashboard.bills.filter(
    (bill) => bill.status === "PENDING",
  );
  const recurringBillsTotal = dashboard.bills
    .filter((bill) => bill.isRecurring)
    .reduce((sum, bill) => sum + Number(bill.amount), 0);
  const goalsCurrent = dashboard.goals.reduce(
    (sum, goal) => sum + Number(goal.currentAmount),
    0,
  );
  const goalsTarget = dashboard.goals.reduce(
    (sum, goal) => sum + Number(goal.targetAmount),
    0,
  );
  const highestCategory = [...dashboard.categorySummary].sort(
    (a, b) => b.value - a.value,
  )[0];
  const savings = income - expenses;

  const advice = [
    {
      title:
        savings >= 0 ? "Seu mês esta positivo" : "Seu mês esta no vermelho",
      description:
        savings >= 0
          ? `Voce esta com uma sobra estimada de ${money(savings)} neste mês. Uma boa divisao seria direcionar parte para metas e parte para reserva.`
          : `Suas despesas superam receitas em ${money(Math.abs(savings))}. Priorize reduzir gastos variaveis antes de assumir novas contas recorrentes.`,
      tone: savings >= 0 ? "success" : "danger",
    },
  ];

  if (highestCategory) {
    advice.push({
      title: `Categoria que mais pesa: ${highestCategory.name}`,
      description: `Essa categoria soma ${money(highestCategory.value)}. Revise os lançamentos dela e defina um teto mensal para controlar melhor o fluxo.`,
      tone: "info",
    });
  }

  if (pendingBills.length) {
    advice.push({
      title: "Agenda com pendencias",
      description: `Voce tem ${pendingBills.length} conta(s) pendente(s). Marcar as pagas ajuda o dashboard a refletir suas despesas reais do mês.`,
      tone: "info",
    });
  }

  if (recurringBillsTotal > income * 0.4 && income > 0) {
    advice.push({
      title: "Contas fixas elevadas",
      description: `Suas contas recorrentes somam ${money(recurringBillsTotal)}, acima de 40% da renda mensal. Vale revisar assinaturas, aluguel e contratos fixos.`,
      tone: "danger",
    });
  }

  if (goalsTarget > 0) {
    advice.push({
      title: "Plano para metas",
      description: `Voce já acumulou ${money(goalsCurrent)} de ${money(goalsTarget)} em metas. Se reservar ${money(Math.max(savings * 0.3, 0))} por mês, acelera o progresso sem apertar demais o caixa.`,
      tone: "success",
    });
  }

  if (investments <= expenses && expenses > 0) {
    advice.push({
      title: "Reserva financeira",
      description:
        "Seu total investido ainda não cobre um mês de despesas. Considere priorizar reserva de emergência antes de aumentar risco em cripto ou ações.",
      tone: "info",
    });
  }

  return advice;
}

const fieldLabels: Record<string, string> = {
  date: "Data",
  dueDate: "Vencimento",
  firstDate: "Data da primeira parcela",
  nextRunAt: "Próxima execução",
  referenceDate: "Data de referencia",
  deadline: "Prazo",
  categoryId: "Categoria",
  accountId: "Conta",
  type: "Tipo",
  resource: "Recurso",
  transactionType: "Tipo de movimentação",
  frequency: "Frequência",
  filterType: "Tipo de movimentação",
  categoryFilter: "Categoria",
  tagFilter: "Tag",
  filterAccount: "Conta",
  filterReconciled: "Conciliação",
  maturityDate: "Vencimento do investimento",
};
export function Input({
  required = true,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const label =
    props["aria-label"] ??
    props.placeholder ??
    fieldLabels[props.name ?? ""] ??
    props.name ??
    "Campo";
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span>{label}</span>
      <input
        {...props}
        required={required}
        className="h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
      />
    </label>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  options: Array<[string, string]>;
  onChange?: (value: string) => void;
};

export function Select({ options, onChange, ...props }: SelectProps) {
  return (
    <select
      aria-label={
        fieldLabels[props.name ?? ""] ?? options[0]?.[1] ?? "Selecionar"
      }
      {...props}
      onChange={(event) => onChange?.(event.target.value)}
      className="h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
    >
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
