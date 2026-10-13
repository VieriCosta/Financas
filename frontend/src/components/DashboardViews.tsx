import { FormEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  BrainCircuit,
  Bell,
  Bot,
  Download,
  Edit3,
  LayoutDashboard,
  KeyRound,
  LogOut,
  Mail,
  Moon,
  PiggyBank,
  Paperclip,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  ShieldCheck,
  SlidersHorizontal,
  Save,
  Send,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  WandSparkles,
  WalletCards,
  X
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Bill, Budget, Category, DashboardData, DashboardPreference, EmergencyReserve, Goal, InternalAlert, Investment, MonthlyClosing, PaginatedTransactions, RecurringRule, Tag, Transaction, User } from "../types/finance";
import { dateLabel, money } from "../utils/format";

import { Toast, TransactionFilters, RefreshedData } from "../types/dashboard";

export function Overview({ dashboard, preference, onBillStatusChange }: { dashboard: DashboardData; preference: DashboardPreference; onBillStatusChange: (bill: Bill) => Promise<void> }) {
  const hidden = new Set(preference.hiddenWidgets);
  const order = (widget: string) => preference.widgetOrder.indexOf(widget) === -1 ? 99 : preference.widgetOrder.indexOf(widget);
  const monthResult = dashboard.cards.monthIncome - dashboard.cards.monthExpense;
  const spendingRatio = dashboard.cards.monthIncome > 0 ? Math.round((dashboard.cards.monthExpense / dashboard.cards.monthIncome) * 100) : 0;

  return (
    <div className="grid gap-5">
      {!hidden.has("metrics") && (
        <section className="overview-hero surface-card animate-rise grid gap-6 rounded-xl p-6 xl:grid-cols-[1fr_0.72fr]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="hero-kicker"><span className="live-pulse" /> VISÃO GERAL <span className="hero-kicker-divider">/</span> SALDO DISPONÍVEL</p>
              <div className="capital-flow" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
            <strong className="hero-balance mt-3 block text-4xl font-semibold sm:text-5xl">{money(dashboard.cards.balance)}</strong>
            <p className="hero-description">Seu dinheiro em perspectiva. Acompanhe hoje, planeje o amanhã.</p>
            <div className="growth-chart mt-7 max-w-2xl" aria-hidden="true">
              <svg viewBox="0 0 640 150" role="presentation">
                <defs>
                  <linearGradient id="growthStroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="68%" stopColor="#5eead4" />
                    <stop offset="100%" stopColor="#a3e635" />
                  </linearGradient>
                  <linearGradient id="growthFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="growth-fill" d="M16 116 C78 78 118 80 166 93 C226 111 252 52 311 65 C369 78 392 98 448 61 C505 23 558 43 624 18 L624 138 L16 138 Z" />
                <path className="growth-path" d="M16 116 C78 78 118 80 166 93 C226 111 252 52 311 65 C369 78 392 98 448 61 C505 23 558 43 624 18" />
                <circle className="growth-dot dot-one" cx="166" cy="93" r="6" />
                <circle className="growth-dot dot-two" cx="311" cy="65" r="6" />
                <circle className="growth-dot dot-three" cx="624" cy="18" r="7" />
              </svg>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <span className={monthResult >= 0 ? "finance-pill rounded-full border px-3 py-1 font-medium" : "rounded-full border border-red-200 px-3 py-1 font-medium text-red-700 dark:border-red-500/30 dark:text-red-300"}>
                {monthResult >= 0 ? "+" : "-"} {money(Math.abs(monthResult))} no mes
              </span>
              <span className="finance-pill-muted rounded-full border px-3 py-1 font-medium">
                {spendingRatio}% da receita usada
              </span>
            </div>
          </div>
          <div className="grid content-stretch gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MiniStat label="Receitas" value={money(dashboard.cards.monthIncome)} tone="income" />
            <MiniStat label="Despesas" value={money(dashboard.cards.monthExpense)} tone="expense" />
            <MiniStat label="Investido" value={money(dashboard.cards.investments)} tone="wealth" />
          </div>
        </section>
      )}

      {!hidden.has("metrics") && <section style={{ order: order("metrics") }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric title="Saldo total" value={money(dashboard.cards.balance)} icon={<WalletCards />} tone="blue" />
        <Metric title="Receitas do mes" value={money(dashboard.cards.monthIncome)} icon={<ArrowUpCircle />} tone="green" />
        <Metric title="Despesas do mes" value={money(dashboard.cards.monthExpense)} icon={<ArrowDownCircle />} tone="red" />
        <Metric title="Investimentos" value={money(dashboard.cards.investments)} icon={<PiggyBank />} tone="slate" />
        <Metric title="Saldo em 30 dias" value={money(dashboard.cards.projectedBalance)} icon={<CalendarClock />} tone={dashboard.cards.projectedBalance < 0 ? "red" : "blue"} />
      </section>}

      {!hidden.has("charts") && <section style={{ order: order("charts") }} className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <Panel title="Fluxo financeiro">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.monthlySeries.slice(-preference.chartMonths)}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#263449" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Area type="monotone" dataKey="receitas" stroke="#22d3ee" fill="url(#income)" strokeWidth={3} />
                <Area type="monotone" dataKey="despesas" stroke="#a78bfa" fill="#a78bfa22" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Gastos por categoria">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.categorySummary} dataKey="value" nameKey="name" outerRadius={110} label>
                  {dashboard.categorySummary.map((entry) => (
                    <Cell key={entry.name} fill={entry.color ?? "#22d3ee"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>}

      {(!hidden.has("bills") || !hidden.has("goals")) && <section style={{ order: Math.min(order("bills"), order("goals")) }} className="grid gap-5 xl:grid-cols-2">
        {!hidden.has("bills") &&
        <Panel title="Proximas contas">
          {dashboard.bills.slice(0, 5).map((bill) => (
            <BillRow key={bill.id} bill={bill} onStatusChange={onBillStatusChange} />
          ))}
        </Panel>}
        {!hidden.has("goals") &&
        <Panel title="Metas em progresso">
          <GoalList goals={dashboard.goals.slice(0, 4)} />
        </Panel>}
      </section>}
    </div>
  );
}

export function MiniStat({ label, value, tone }: { label: string; value: string; tone: "income" | "expense" | "wealth" }) {
  return (
    <div className={`mini-stat mini-stat-${tone} rounded-lg p-3`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <strong className="mt-1 block text-base font-semibold">{value}</strong>
      <div aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function TransactionsView({
  categories,
  tags,
  filters,
  setFilters,
  transactions,
  pagination,
  saving,
  onSubmit,
  onUpdate,
  onRemove,
  onPageChange,
  onExportCsv,
  onRefresh,
  notify
}: {
  categories: Category[];
  tags: Tag[];
  filters: TransactionFilters;
  setFilters: (filters: TransactionFilters) => void;
  transactions: Transaction[];
  pagination: PaginatedTransactions;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdate: (transactionId: string, payload: Record<string, number | string | undefined>) => Promise<void>;
  onRemove: (transaction: Transaction) => void;
  onPageChange: (page: number) => Promise<void>;
  onExportCsv: () => Promise<void>;
  onRefresh: () => Promise<RefreshedData | null>;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const [newTransactionType, setNewTransactionType] = useState<Transaction["type"]>("EXPENSE");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const newTransactionCategories = categories.filter((category) => categoryMatchesTransactionType(category, newTransactionType));

  async function bulk(action: "DELETE" | "ADD_TAG", tagId?: string) {
    if (!selectedIds.length) return;
    try {
      await api.post("/transactions/bulk", { ids: selectedIds, action, tagId });
      setSelectedIds([]);
      await onRefresh();
      notify("success", "Movimentacoes atualizadas em lote.");
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel atualizar os itens selecionados."));
    }
  }

  async function createTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api.post("/tags", { name: form.get("name"), color: form.get("color") });
    formElement.reset();
    await onRefresh();
    notify("success", "Tag criada.");
  }

  async function uploadAttachment(transactionId: string, file: File) {
    try {
      await api.post(`/transactions/${transactionId}/attachments`, file, { headers: { "Content-Type": file.type, "X-Filename": file.name } });
      await onRefresh();
      notify("success", "Comprovante anexado.");
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel anexar o comprovante."));
    }
  }

  async function downloadAttachment(attachment: { id: string; filename: string }) {
    const { data } = await api.get(`/attachments/${attachment.id}`, { responseType: "blob" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Nova movimentacao">
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Input name="description" placeholder="Descricao" />
          <Input name="amount" placeholder="Valor" type="number" step="0.01" />
          <Select name="type" value={newTransactionType} onChange={(value) => setNewTransactionType(value as Transaction["type"])} options={[["INCOME", "Receita"], ["EXPENSE", "Despesa"]]} />
          <Select name="categoryId" options={[["", newTransactionType === "INCOME" ? "Categoria de receita" : "Categoria de despesa"], ...newTransactionCategories.map((item) => [item.id, item.name] as [string, string])]} />
          <Input name="date" type="date" />
          <SubmitButton disabled={saving}><Plus size={18} /> Adicionar</SubmitButton>
        </form>
      </Panel>

      <Panel title="Historico de movimentacoes">
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <Search size={16} />
            <select aria-label="Mes do historico" value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className="bg-transparent outline-none">
              <option value="">Todos os meses</option>
              {Array.from({ length: 12 }).map((_, index) => <option key={index + 1} value={index + 1}>{new Date(2026, index, 1).toLocaleDateString("pt-BR", { month: "long" })}</option>)}
            </select>
          </label>
          <input aria-label="Ano do historico" type="number" min="2000" max="2200" placeholder="Todos os anos" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className="h-10 w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900" />
          <Select name="filterType" value={filters.type} onChange={(value) => setFilters({ ...filters, type: value })} options={[["", "Todos"], ["INCOME", "Receitas"], ["EXPENSE", "Despesas"]]} />
          <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none" />
          <Select name="categoryFilter" value={filters.categoryId} onChange={(value) => setFilters({ ...filters, categoryId: value })} options={[["", "Categorias"], ...categories.map((item) => [item.id, item.name] as [string, string])]} />
          <Select name="tagFilter" value={filters.tagId} onChange={(value) => setFilters({ ...filters, tagId: value })} options={[["", "Tags"], ...tags.map((item) => [item.id, item.name] as [string, string])]} />
          <input value={filters.minAmount} onChange={(event) => setFilters({ ...filters, minAmount: event.target.value })} type="number" placeholder="Valor minimo" className="h-10 w-32 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900" />
          <input value={filters.maxAmount} onChange={(event) => setFilters({ ...filters, maxAmount: event.target.value })} type="number" placeholder="Valor maximo" className="h-10 w-32 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900" />
          <button type="button" onClick={onExportCsv} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800">
            <Download size={16} /> CSV
          </button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button disabled={!selectedIds.length} onClick={() => void bulk("DELETE")} className="h-9 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600 disabled:opacity-40">Excluir selecionadas</button>
          {tags.map((tag) => <button key={tag.id} disabled={!selectedIds.length} onClick={() => void bulk("ADD_TAG", tag.id)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40 dark:border-slate-800">+ {tag.name}</button>)}
          <form onSubmit={createTag} className="ml-auto flex gap-2"><input name="name" required placeholder="Nova tag" className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-800 dark:bg-slate-950" /><input name="color" type="color" defaultValue="#2563eb" className="h-9 w-10" /><button className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white">Criar tag</button></form>
        </div>
        <TransactionList transactions={transactions} categories={categories} selectedIds={selectedIds} onSelectionChange={setSelectedIds} onUpload={uploadAttachment} onDownload={downloadAttachment} onUpdate={onUpdate} onRemove={onRemove} />
        <Pagination pagination={pagination} onPageChange={onPageChange} />
      </Panel>
    </div>
  );
}

export function AgendaView({
  bills,
  saving,
  onSubmit,
  onBillStatusChange,
  onRemove
}: {
  bills: Bill[];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onBillStatusChange: (bill: Bill) => Promise<void>;
  onRemove: (bill: Bill) => void;
}) {
  const pending = bills.filter((bill) => bill.status === "PENDING");
  const paid = bills.filter((bill) => bill.status === "PAID");
  const recurring = bills.filter((bill) => bill.isRecurring);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Nova conta ou lembrete">
        <form onSubmit={onSubmit} className="grid gap-3">
          <Input name="title" placeholder="Conta, boleto ou lembrete" />
          <Input name="amount" placeholder="Valor" type="number" step="0.01" />
          <Input name="dueDate" type="date" />
          <Select name="status" options={[["PENDING", "Pendente"], ["PAID", "Paga"]]} />
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium dark:border-slate-800 dark:bg-slate-950">
            <input name="isRecurring" type="checkbox" className="h-4 w-4 accent-blue-600" />
            Repetir todo mes nesta data
          </label>
          <SubmitButton disabled={saving}>Salvar na agenda</SubmitButton>
        </form>
      </Panel>

      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-3">
          <Metric title="Pendentes" value={String(pending.length)} icon={<CalendarClock />} tone="red" />
          <Metric title="Pagas" value={String(paid.length)} icon={<CheckCircle2 />} tone="green" />
          <Metric title="Todo mes" value={String(recurring.length)} icon={<ReceiptText />} tone="blue" />
        </section>

        <Panel title="Contas da agenda">
          <div className="space-y-3">
            {bills.map((bill) => <BillRow key={bill.id} bill={bill} onStatusChange={onBillStatusChange} onRemove={onRemove} />)}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function PlanningView({
  categories,
  notify,
  onRefresh
}: {
  categories: Category[];
  notify: (type: "success" | "error", message: string) => void;
  onRefresh: () => Promise<RefreshedData | null>;
}) {
  const now = new Date();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadPlanning() {
    const [budgetResponse, rulesResponse] = await Promise.all([
      api.get<Budget[]>("/budgets", { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
      api.get<RecurringRule[]>("/recurring-rules")
    ]);
    setBudgets(budgetResponse.data);
    setRules(rulesResponse.data);
  }

  useEffect(() => {
    loadPlanning().catch(() => notify("error", "Nao foi possivel carregar o planejamento."));
  }, []);

  async function submitInstallments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      setSaving(true);
      await api.post("/installments", {
        description: form.get("description"),
        totalAmount: Number(form.get("totalAmount")),
        installments: Number(form.get("installments")),
        firstDate: form.get("firstDate"),
        categoryId: form.get("categoryId") || undefined
      });
      formElement.reset();
      await onRefresh();
      notify("success", "Compra parcelada distribuida nas movimentacoes.");
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel criar as parcelas."));
    } finally {
      setSaving(false);
    }
  }

  async function submitBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      setSaving(true);
      await api.post("/budgets", {
        categoryId: form.get("categoryId"),
        limitAmount: Number(form.get("limitAmount")),
        month: now.getMonth() + 1,
        year: now.getFullYear()
      });
      formElement.reset();
      await loadPlanning();
      notify("success", "Limite mensal salvo.");
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel salvar o limite."));
    } finally {
      setSaving(false);
    }
  }

  async function submitRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const resource = String(form.get("resource"));
    try {
      setSaving(true);
      await api.post("/recurring-rules", {
        resource,
        title: form.get("title"),
        amount: Number(form.get("amount")),
        transactionType: resource === "TRANSACTION" ? form.get("transactionType") : undefined,
        categoryId: resource === "TRANSACTION" ? form.get("categoryId") || undefined : undefined,
        frequency: form.get("frequency"),
        interval: Number(form.get("interval") || 1),
        nextRunAt: form.get("nextRunAt")
      });
      formElement.reset();
      await loadPlanning();
      await onRefresh();
      notify("success", "Regra recorrente criada.");
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel criar a recorrencia."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(path: string, id: string) {
    try {
      await api.delete(`/${path}/${id}`);
      await loadPlanning();
      notify("success", "Item removido do planejamento.");
    } catch {
      notify("error", "Nao foi possivel remover este item.");
    }
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Compra parcelada">
          <form onSubmit={submitInstallments} className="grid gap-3">
            <Input name="description" placeholder="Descricao da compra" />
            <Input name="totalAmount" type="number" step="0.01" placeholder="Valor total" />
            <Input name="installments" type="number" min="2" max="120" placeholder="Numero de parcelas" />
            <Input name="firstDate" type="date" />
            <Select name="categoryId" options={[["", "Categoria"], ...categories.map((item) => [item.id, item.name] as [string, string])]} />
            <SubmitButton disabled={saving}>Distribuir parcelas</SubmitButton>
          </form>
        </Panel>

        <Panel title="Limite por categoria">
          <form onSubmit={submitBudget} className="grid gap-3">
            <Select name="categoryId" options={categories.map((item) => [item.id, item.name] as [string, string])} />
            <Input name="limitAmount" type="number" step="0.01" placeholder="Limite deste mes" />
            <SubmitButton disabled={saving}>Salvar limite</SubmitButton>
          </form>
        </Panel>

        <Panel title="Nova recorrencia">
          <form onSubmit={submitRule} className="grid gap-3">
            <Select name="resource" options={[["TRANSACTION", "Movimentacao"], ["BILL", "Conta na agenda"]]} />
            <Input name="title" placeholder="Descricao" />
            <Input name="amount" type="number" step="0.01" placeholder="Valor" />
            <Select name="transactionType" options={[["EXPENSE", "Despesa"], ["INCOME", "Receita"]]} />
            <Select name="categoryId" options={[["", "Categoria opcional"], ...categories.map((item) => [item.id, item.name] as [string, string])]} />
            <Select name="frequency" options={[["WEEKLY", "Semanal"], ["MONTHLY", "Mensal"], ["YEARLY", "Anual"]]} />
            <Input name="interval" type="number" min="1" defaultValue="1" placeholder="Intervalo" />
            <Input name="nextRunAt" type="date" />
            <SubmitButton disabled={saving}>Criar recorrencia</SubmitButton>
          </form>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Orcamentos do mes">
          {budgets.length === 0 && <p className="text-sm text-slate-500">Nenhum limite cadastrado neste mes.</p>}
          {budgets.map((budget) => (
            <article key={budget.id} className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3 text-sm"><strong>{budget.category.name}</strong><button onClick={() => void remove("budgets", budget.id)} className="text-red-600"><Trash2 size={16} /></button></div>
              <p className="mt-2 text-sm text-slate-500">{money(budget.spent)} de {money(Number(budget.limitAmount))}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full ${budget.percentage > 100 ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${Math.min(budget.percentage, 100)}%` }} /></div>
            </article>
          ))}
        </Panel>
        <Panel title="Regras recorrentes">
          {rules.length === 0 && <p className="text-sm text-slate-500">Nenhuma regra recorrente cadastrada.</p>}
          {rules.map((rule) => (
            <article key={rule.id} className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div><strong>{rule.title}</strong><p className="mt-1 text-slate-500">{money(Number(rule.amount))} · {rule.frequency.toLowerCase()} · proxima: {dateLabel(rule.nextRunAt)}</p></div>
              <button onClick={() => void remove("recurring-rules", rule.id)} className="text-red-600"><Trash2 size={16} /></button>
            </article>
          ))}
        </Panel>
      </section>
    </div>
  );
}

export function InsightsView({
  preference,
  setPreference,
  notify
}: {
  preference: DashboardPreference;
  setPreference: (preference: DashboardPreference) => void;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const now = new Date();
  const [closing, setClosing] = useState<MonthlyClosing | null>(null);
  const [alerts, setAlerts] = useState<InternalAlert[]>([]);
  const [reserve, setReserve] = useState<EmergencyReserve | null>(null);
  const [logs, setLogs] = useState<Array<{ id: string; action: string; resource: string; createdAt: string }>>([]);
  const [sessions, setSessions] = useState<Array<{ id: string; userAgent?: string; ipAddress?: string; lastSeenAt: string; current: boolean }>>([]);

  async function loadInsights() {
    const [closingResponse, alertsResponse, reserveResponse, logsResponse, sessionsResponse] = await Promise.all([
      api.get("/monthly-closing", { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
      api.get("/alerts"),
      api.get("/emergency-reserve"),
      api.get("/audit-logs"),
      api.get("/profile/sessions")
    ]);
    setClosing(closingResponse.data);
    setAlerts(alertsResponse.data);
    setReserve(reserveResponse.data);
    setLogs(logsResponse.data);
    setSessions(sessionsResponse.data);
  }

  useEffect(() => {
    loadInsights().catch(() => notify("error", "Nao foi possivel carregar os insights."));
  }, []);

  async function closeMonth() {
    await api.post("/monthly-closing", { month: now.getMonth() + 1, year: now.getFullYear() });
    await loadInsights();
    notify("success", "Fechamento mensal salvo.");
  }

  async function savePreference(next: DashboardPreference) {
    const { data } = await api.put("/dashboard-preference", next);
    setPreference(data);
    notify("success", "Dashboard personalizado.");
  }

  function moveWidget(widget: string, direction: -1 | 1) {
    const list = [...preference.widgetOrder];
    const index = list.indexOf(widget);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return;
    [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
    void savePreference({ ...preference, widgetOrder: list });
  }

  async function revokeOtherSessions() {
    await api.delete("/profile/sessions/others");
    await loadInsights();
    notify("success", "Outras sessoes encerradas.");
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Reserva de emergencia" value={money(reserve?.reserve ?? 0)} icon={<ShieldCheck />} tone="green" />
        <Metric title="Meses cobertos" value={`${(reserve?.coveredMonths ?? 0).toFixed(1)} meses`} icon={<PiggyBank />} tone={(reserve?.coveredMonths ?? 0) >= 6 ? "green" : "red"} />
        <Metric title="Meta recomendada" value={money(reserve?.recommendedReserve ?? 0)} icon={<Target />} tone="blue" />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Fechamento mensal">
          <p className="text-sm text-slate-500">Compare o realizado com seus limites e registre uma fotografia deste mes.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p>Receitas<br /><strong>{money(closing?.income ?? 0)}</strong></p><p>Despesas<br /><strong>{money(closing?.expense ?? 0)}</strong></p>
            <p>Orcamento<br /><strong>{money(closing?.budgetTotal ?? 0)}</strong></p><p>Resultado<br /><strong>{money(closing?.balance ?? 0)}</strong></p>
          </div>
          <button onClick={closeMonth} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{closing?.saved ? "Atualizar fechamento" : "Fechar mes"}</button>
        </Panel>
        <Panel title="Alertas internos">
          {alerts.length === 0 && <p className="text-sm text-slate-500">Tudo tranquilo por aqui.</p>}
          {alerts.map((item, index) => <article key={`${item.type}-${index}`} className="mb-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"><strong className={item.tone === "danger" ? "text-red-600" : "text-amber-600"}><Bell className="mr-2 inline" size={15} />{item.title}</strong><p className="mt-1 text-slate-500">{item.message}</p></article>)}
        </Panel>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Personalizar dashboard">
          <p className="mb-3 text-sm text-slate-500">Escolha os blocos visiveis e o periodo dos graficos.</p>
          {["metrics", "charts", "bills", "goals"].map((widget) => <label key={widget} className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!preference.hiddenWidgets.includes(widget)} onChange={() => void savePreference({ ...preference, hiddenWidgets: preference.hiddenWidgets.includes(widget) ? preference.hiddenWidgets.filter((item) => item !== widget) : [...preference.hiddenWidgets, widget] })} /> Mostrar {widget}</label>)}
          <div className="my-3 grid gap-2">{preference.widgetOrder.filter((widget) => ["metrics", "charts", "bills", "goals"].includes(widget)).map((widget) => <div key={widget} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"><span>{widget}</span><span><button onClick={() => moveWidget(widget, -1)} className="px-2">↑</button><button onClick={() => moveWidget(widget, 1)} className="px-2">↓</button></span></div>)}</div>
          <Select name="chartMonths" value={String(preference.chartMonths)} onChange={(value) => void savePreference({ ...preference, chartMonths: Number(value) })} options={[["3", "Ultimos 3 meses"], ["6", "Ultimos 6 meses"], ["12", "Ultimos 12 meses"]]} />
        </Panel>
        <Panel title="Sessoes ativas">
          <button onClick={revokeOtherSessions} className="mb-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600">Encerrar outras sessoes</button>
          {sessions.map((session) => <article key={session.id} className="mb-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"><strong>{session.current ? "Sessao atual" : "Outro dispositivo"}</strong><p className="mt-1 text-slate-500">{session.userAgent ?? "Dispositivo nao identificado"} · {session.ipAddress ?? "IP indisponivel"}</p></article>)}
        </Panel>
      </section>
      <Panel title="Auditoria recente">
        {logs.length === 0 && <p className="text-sm text-slate-500">Nenhuma alteracao registrada ainda.</p>}
        {logs.slice(0, 12).map((log) => <p key={log.id} className="border-b border-slate-100 py-2 text-sm dark:border-slate-800"><strong>{log.action}</strong> · {log.resource}<span className="float-right text-slate-500">{dateLabel(log.createdAt)}</span></p>)}
      </Panel>
    </div>
  );
}

export function InvestmentsView({
  investments,
  monthlySeries,
  saving,
  onSubmit,
  onUpdate,
  onRemove
}: {
  investments: Investment[];
  monthlySeries: DashboardData["monthlySeries"];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdate: (investmentId: string, payload: Record<string, number | string | undefined>) => Promise<void>;
  onRemove: (investment: Investment) => void;
}) {
  const projectedReturn = investments.reduce((sum, investment) => sum + estimateMonthlyReturn(investment), 0);
  const [selectedType, setSelectedType] = useState<Investment["type"]>("FIXED_INCOME");

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Novo investimento ou aporte">
        <form onSubmit={onSubmit} className="grid gap-3">
          <Input name="name" placeholder={investmentNamePlaceholder(selectedType)} />
          <Select name="type" value={selectedType} onChange={(value) => setSelectedType(value as Investment["type"])} options={investmentTypeOptions} />
          <InvestmentFields type={selectedType} />
          <SubmitButton disabled={saving}>Registrar investimento</SubmitButton>
        </form>
      </Panel>

      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-3">
          <Metric title="Ativos cadastrados" value={String(investments.length)} icon={<TrendingUp />} tone="blue" />
          <Metric title="Rendimento estimado" value={money(projectedReturn)} icon={<PiggyBank />} tone="green" />
          <Metric title="Patrimonio investido" value={money(investments.reduce((sum, item) => sum + Number(item.currentValue), 0))} icon={<WalletCards />} tone="slate" />
        </section>

        <Panel title="Investimentos cadastrados">
          <div className="space-y-4">
            {investments.length ? investments.map((investment) => (
              <InvestmentCard key={investment.id} investment={investment} onUpdate={onUpdate} onRemove={onRemove} />
            )) : <EmptyState text="Nenhum investimento cadastrado ainda." />}
          </div>
        </Panel>

        <Panel title="Evolucao de aportes">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="receitas" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function InvestmentCard({
  investment,
  onUpdate,
  onRemove
}: {
  investment: Investment;
  onUpdate: (investmentId: string, payload: Record<string, number | string | undefined>) => Promise<void>;
  onRemove: (investment: Investment) => void;
}) {
  const effectiveMonthlyRate = getEffectiveMonthlyRate(investment);
  const monthlyReturn = estimateMonthlyReturn(investment);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-transparent">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">{investment.name}</p>
          <p className="text-sm text-slate-500">
            {investmentTypeLabel(investment.type)} - {money(investment.currentValue)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Rende aprox. {effectiveMonthlyRate.toFixed(2)}% ao mes ({money(monthlyReturn)})
          </p>
          <InvestmentDetails investment={investment} />
        </div>
        <div className="flex items-center gap-2">
          {investment.cdiPercent && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              CDI {Number(investment.cdiPercent ?? 100).toFixed(0)}%
            </span>
          )}
          <IconButton label="Remover investimento" onClick={() => onRemove(investment)} />
        </div>
      </div>

      <form
        className="grid gap-3 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onUpdate(investment.id, readInvestmentPayload(form));
        }}
      >
        <InvestmentFields type={investment.type} investment={investment} compact />
        <button className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800">Salvar edicao</button>
      </form>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const amount = Number(form.get("addContribution"));
          if (!amount || amount <= 0) return;
          onUpdate(investment.id, { addContribution: amount });
          event.currentTarget.reset();
        }}
      >
        <input name="addContribution" type="number" step="0.01" min="0.01" placeholder="Adicionar aporte" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950" />
        <button className="h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700">Adicionar</button>
      </form>
    </div>
  );
}

const investmentTypeOptions: Array<[Investment["type"], string]> = [
  ["FIXED_INCOME", "Renda fixa"],
  ["EMERGENCY_RESERVE", "Reserva"],
  ["STOCK", "Acoes"],
  ["CRYPTO", "Criptomoedas"],
  ["OTHER", "Outro"]
];

export function InvestmentFields({ type, investment, compact = false }: { type: Investment["type"]; investment?: Investment; compact?: boolean }) {
  const gridClass = compact ? "contents" : "grid gap-3";

  return (
    <div className={gridClass}>
      <Input name="currentValue" placeholder="Valor atual" type="number" step="0.01" defaultValue={numberDefault(investment?.currentValue)} />
      <Input name="investedAmount" placeholder="Valor investido" type="number" step="0.01" defaultValue={numberDefault(investment?.investedAmount)} />
      <Input name="contribution" placeholder="Aporte do mes" type="number" step="0.01" required={false} defaultValue={numberDefault(investment?.contribution)} />

      {(type === "STOCK" || type === "CRYPTO") && (
        <>
          <Input name="ticker" placeholder={type === "STOCK" ? "Ticker (ex: PETR4)" : "Simbolo (ex: BTC)"} defaultValue={investment?.ticker ?? ""} />
          <Input name="quantity" placeholder="Quantidade" type="number" step="0.00000001" defaultValue={numberDefault(investment?.quantity)} />
          <Input name="averagePrice" placeholder="Preco medio" type="number" step="0.00000001" required={false} defaultValue={numberDefault(investment?.averagePrice)} />
        </>
      )}

      {type === "STOCK" && <Input name="broker" placeholder="Corretora" required={false} defaultValue={investment?.broker ?? ""} />}

      {type === "CRYPTO" && (
        <>
          <Input name="custodyLocation" placeholder="Custodia (corretora ou carteira)" required={false} defaultValue={investment?.custodyLocation ?? ""} />
          <Input name="walletAddress" placeholder="Endereco da carteira" required={false} defaultValue={investment?.walletAddress ?? ""} />
        </>
      )}

      {(type === "FIXED_INCOME" || type === "EMERGENCY_RESERVE") && (
        <>
          <Input name="institution" placeholder="Instituicao" defaultValue={investment?.institution ?? ""} />
          <Select name="indexer" defaultValue={investment?.indexer ?? (type === "FIXED_INCOME" ? "CDI" : "CDI")} options={[["CDI", "CDI"], ["IPCA", "IPCA"], ["PREFIXED", "Prefixado"], ["SELIC", "Selic"], ["SAVINGS", "Poupanca"]]} />
          <Input name="cdiPercent" placeholder="% do CDI" type="number" step="0.01" required={false} defaultValue={numberDefault(investment?.cdiPercent ?? 100)} />
          <Input name="annualRate" placeholder="Taxa anual %" type="number" step="0.01" required={false} defaultValue={numberDefault(investment?.annualRate)} />
          <Input name="monthlyYieldRate" placeholder="Rendimento mensal %" type="number" step="0.01" required={false} defaultValue={numberDefault(investment?.monthlyYieldRate)} />
          <Input name="cdiMonthlyRate" placeholder="CDI mensal base %" type="number" step="0.01" required={false} defaultValue={numberDefault(investment?.cdiMonthlyRate)} />
          <Input name="liquidity" placeholder={type === "EMERGENCY_RESERVE" ? "Liquidez (ex: D+0)" : "Liquidez (ex: vencimento ou D+1)"} required={false} defaultValue={investment?.liquidity ?? ""} />
        </>
      )}

      {type === "FIXED_INCOME" && <Input name="maturityDate" type="date" required={false} defaultValue={investment?.maturityDate ? String(investment.maturityDate).slice(0, 10) : ""} />}

      {type === "OTHER" && (
        <>
          <Input name="institution" placeholder="Instituicao ou local" required={false} defaultValue={investment?.institution ?? ""} />
          <Input name="notes" placeholder="Descricao do ativo" required={false} defaultValue={investment?.notes ?? ""} />
          <Input name="monthlyYieldRate" placeholder="Rendimento mensal %" type="number" step="0.01" required={false} defaultValue={numberDefault(investment?.monthlyYieldRate)} />
        </>
      )}
    </div>
  );
}

export function InvestmentDetails({ investment }: { investment: Investment }) {
  const details = [
    investment.ticker ? `Ticker: ${investment.ticker}` : null,
    investment.quantity ? `Qtd: ${Number(investment.quantity).toLocaleString("pt-BR")}` : null,
    investment.averagePrice ? `Preco medio: ${money(investment.averagePrice)}` : null,
    investment.broker ? `Corretora: ${investment.broker}` : null,
    investment.institution ? `Instituicao: ${investment.institution}` : null,
    investment.indexer ? `Indexador: ${investment.indexer}` : null,
    investment.annualRate ? `Taxa anual: ${Number(investment.annualRate).toFixed(2)}%` : null,
    investment.maturityDate ? `Vence em: ${dateLabel(investment.maturityDate)}` : null,
    investment.liquidity ? `Liquidez: ${investment.liquidity}` : null,
    investment.custodyLocation ? `Custodia: ${investment.custodyLocation}` : null
  ].filter(Boolean);

  if (!details.length) return null;

  return <p className="mt-2 text-xs leading-5 text-slate-500">{details.join(" - ")}</p>;
}

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
    notes: textFromForm(form, "notes")
  };
}

export function investmentNamePlaceholder(type: Investment["type"]) {
  const placeholders: Record<Investment["type"], string> = {
    STOCK: "Nome da acao ou FII",
    CRYPTO: "Nome da criptomoeda",
    FIXED_INCOME: "Nome do titulo",
    EMERGENCY_RESERVE: "Nome da reserva",
    OTHER: "Nome do investimento"
  };

  return placeholders[type];
}

export function numberFromForm(form: FormData, name: string, fallback?: number) {
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

export function GoalsView({
  goals,
  saving,
  onSubmit,
  onAddAmount,
  onRemove
}: {
  goals: Goal[];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAddAmount: (goalId: string, amount: number) => Promise<void>;
  onRemove: (goal: Goal) => void;
}) {
  const targetTotal = goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);
  const currentTotal = goals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
  const percent = targetTotal ? Math.round((currentTotal / targetTotal) * 100) : 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Nova meta financeira">
        <form onSubmit={onSubmit} className="grid gap-3">
          <Input name="title" placeholder="Nome da meta" />
          <Input name="targetAmount" placeholder="Objetivo" type="number" step="0.01" />
          <Input name="currentAmount" placeholder="Valor atual" type="number" step="0.01" />
          <Input name="deadline" type="date" />
          <SubmitButton disabled={saving}>Criar meta</SubmitButton>
        </form>
      </Panel>

      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-3">
          <Metric title="Objetivo total" value={money(targetTotal)} icon={<Target />} tone="blue" />
          <Metric title="Ja reservado" value={money(currentTotal)} icon={<PiggyBank />} tone="green" />
          <Metric title="Progresso" value={`${percent}%`} icon={<TrendingUp />} tone="slate" />
        </section>
        <Panel title="Todas as metas">
          <GoalList goals={goals} onAddAmount={onAddAmount} onRemove={onRemove} />
        </Panel>
      </div>
    </div>
  );
}

type AiCommandPreview = {
  ready: boolean;
  summary: string;
  clarification: string | null;
  confirmationToken: string | null;
  actions: Array<Record<string, unknown>>;
};

type AiHistoryItem = {
  id: string;
  kind: "ADVICE" | "COMMAND" | "REPORT";
  status: "ANSWERED" | "PENDING" | "CONFIRMED";
  request: string;
  response: string;
  createdAt: string;
};

export function AiAdviceView({
  dashboard,
  onRefresh,
  notify
}: {
  dashboard: DashboardData;
  onRefresh: () => Promise<RefreshedData | null>;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const advice = buildFinancialAdvice(dashboard);
  const expenseRatio = dashboard.cards.monthIncome > 0 ? Math.round((dashboard.cards.monthExpense / dashboard.cards.monthIncome) * 100) : 0;
  const goalProgress = dashboard.goals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
  const goalTarget = dashboard.goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);
  const [mode, setMode] = useState<"advice" | "command">("advice");
  const [loadingAi, setLoadingAi] = useState(false);
  const [adviceAnswer, setAdviceAnswer] = useState("");
  const [preview, setPreview] = useState<AiCommandPreview | null>(null);
  const [history, setHistory] = useState<AiHistoryItem[]>([]);

  async function loadHistory() {
    const { data } = await api.get<AiHistoryItem[]>("/ai/history");
    setHistory(data);
  }

  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, []);

  async function submitAdvice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      setLoadingAi(true);
      const { data } = await api.post("/ai/advice", { message: form.get("message") });
      setAdviceAnswer(data.message);
      await loadHistory();
      formElement.reset();
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel consultar a IA agora."));
    } finally {
      setLoadingAi(false);
    }
  }

  async function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      setLoadingAi(true);
      const { data } = await api.post<AiCommandPreview>("/ai/commands/preview", { message: form.get("message") });
      setPreview(data);
      formElement.reset();
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel interpretar o pedido agora."));
    } finally {
      setLoadingAi(false);
    }
  }

  async function confirmCommand() {
    if (!preview?.confirmationToken) return;

    try {
      setLoadingAi(true);
      await api.post("/ai/commands/confirm", { confirmationToken: preview.confirmationToken });
      await onRefresh();
      await loadHistory();
      setPreview(null);
      notify("success", "Operacoes confirmadas e salvas pela assistente.");
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel confirmar este cadastro."));
    } finally {
      setLoadingAi(false);
    }
  }

  async function createReport() {
    try {
      setLoadingAi(true);
      const { data } = await api.post("/ai/report");
      setAdviceAnswer(data.message);
      setMode("advice");
      await loadHistory();
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel gerar o relatorio mensal."));
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Gastos / receita" value={`${expenseRatio}%`} icon={<ReceiptText />} tone={expenseRatio > 80 ? "red" : "blue"} />
        <Metric title="Metas guardadas" value={money(goalProgress)} icon={<Target />} tone="green" />
        <Metric title="Falta para metas" value={money(Math.max(goalTarget - goalProgress, 0))} icon={<PiggyBank />} tone="slate" />
      </section>

      <Panel title="Assistente financeiro">
        <div className="mb-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode("advice")} className={mode === "advice" ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"}>
            <Bot className="mr-2 inline" size={17} /> Pedir conselho
          </button>
          <button type="button" onClick={() => setMode("command")} className={mode === "command" ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"}>
            <WandSparkles className="mr-2 inline" size={17} /> Comandos rapidos
          </button>
          <button type="button" disabled={loadingAi} onClick={createReport} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <ReceiptText className="mr-2 inline" size={17} /> Relatorio mensal
          </button>
        </div>

        {mode === "advice" ? (
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Converse sobre seus dados financeiros atuais. Exemplo: “onde estou gastando demais?” ou “como posso acelerar minha reserva?”.</p>
            <AiMessageForm disabled={loadingAi} placeholder="Pergunte algo sobre suas financas..." onSubmit={submitAdvice} />
            {adviceAnswer && <AiAnswer text={adviceAnswer} />}
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Descreva um ou varios cadastros. A assistente tambem pode propor edicoes e exclusoes, sempre com sua confirmacao.</p>
            <AiMessageForm disabled={loadingAi} placeholder='Ex.: "gastei 85 no mercado e 40 na farmacia hoje"' onSubmit={submitCommand} />
            {preview && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                <p className="font-semibold text-blue-950 dark:text-blue-100">{preview.ready ? "Confira antes de salvar" : "Preciso de mais uma informacao"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{preview.clarification ?? preview.summary}</p>
                {preview.ready && preview.actions.length > 0 && (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3 text-sm text-slate-700 dark:border-blue-500/20 dark:bg-slate-950 dark:text-slate-200">
                    <p className="font-semibold">{preview.actions.length} operacao(oes) proposta(s)</p>
                    <p className="mt-1 leading-6">{preview.summary}</p>
                  </div>
                )}
                {preview.confirmationToken && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" disabled={loadingAi} onClick={confirmCommand} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">Confirmar cadastro</button>
                    <button type="button" onClick={() => setPreview(null)} className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 dark:border-blue-500/30 dark:bg-slate-950 dark:text-slate-300">Cancelar</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Historico da assistente">
        {history.length === 0 && <p className="text-sm text-slate-500">Nenhuma interacao registrada ainda.</p>}
        {history.slice(0, 8).map((item) => (
          <article key={item.id} className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{item.kind} · {item.status}</p>
            <p className="mt-1 text-sm font-semibold">{item.request}</p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-500">{item.response}</p>
          </article>
        ))}
      </Panel>

      <Panel title="Recomendacoes automaticas">
        <div className="grid gap-3">
          {advice.map((item) => (
            <article key={item.title} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-transparent">
              <div className="mb-2 flex items-center gap-2">
                <span className={item.tone === "danger" ? "h-2.5 w-2.5 rounded-full bg-red-500" : item.tone === "success" ? "h-2.5 w-2.5 rounded-full bg-emerald-500" : "h-2.5 w-2.5 rounded-full bg-blue-500"} />
                <h2 className="font-semibold">{item.title}</h2>
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function AiMessageForm({ disabled, placeholder, onSubmit }: { disabled: boolean; placeholder: string; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input name="message" required maxLength={1000} placeholder={placeholder} className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none" />
      <button disabled={disabled} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
        <Send size={17} /> {disabled ? "Consultando..." : "Enviar"}
      </button>
    </form>
  );
}

export function AiAnswer({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 flex items-center gap-2 font-semibold"><Bot size={18} className="text-blue-600 dark:text-blue-300" /> Assistente</div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{text}</p>
    </div>
  );
}

export function aiResourceLabel(resource: string) {
  return {
    TRANSACTION: "Movimentacao",
    BILL: "Conta na agenda",
    INVESTMENT: "Investimento",
    GOAL: "Meta financeira"
  }[resource] ?? "Cadastro financeiro";
}

export function ProfileView({
  user,
  onUserUpdate,
  notify
}: {
  user: User | null;
  onUserUpdate: (user: User) => void;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const [profile, setProfile] = useState<User | null>(user);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    api.get<User>("/profile").then(({ data }) => {
      setProfile(data);
      setName(data.name);
      setEmail(data.email);
      onUserUpdate(data);
    }).catch(() => undefined);
  }, []);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingProfile(true);
      const { data } = await api.patch<User>("/profile", { name, email, currentPassword: currentPassword || undefined });
      setProfile(data);
      setCurrentPassword("");
      onUserUpdate(data);
      notify("success", "Dados do perfil atualizados.");
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel atualizar seus dados."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword"));

    if (newPassword !== String(form.get("passwordConfirmation"))) {
      notify("error", "A confirmacao da nova senha nao confere.");
      return;
    }

    try {
      setSavingPassword(true);
      await api.patch("/profile/password", {
        currentPassword: form.get("currentPassword"),
        newPassword
      });
      const { data } = await api.get("/auth/session");
      sessionStorage.setItem("finance.csrf", data.csrfToken);
      formElement.reset();
      notify("success", "Senha alterada com sucesso.");
    } catch (error) {
      notify("error", getApiErrorMessage(error, "Nao foi possivel alterar sua senha."));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
      <Panel title="Sua conta">
        <div className="grid gap-5">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {profile?.name.slice(0, 1).toUpperCase() ?? "U"}
            </span>
            <div>
              <p className="text-lg font-semibold">{profile?.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.email}</p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-slate-100 pt-5 text-sm dark:border-slate-800">
            <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Mail size={17} /> {profile?.email}</p>
            {profile?.createdAt && <p className="text-slate-500 dark:text-slate-400">Conta criada em {dateLabel(profile.createdAt)}</p>}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5">
        <Panel title="Dados pessoais">
          <form onSubmit={submitProfile} className="grid gap-3 sm:grid-cols-2">
            <Input name="name" placeholder="Seu nome" value={name} onChange={(event) => setName(event.target.value)} />
            <Input name="email" placeholder="voce@email.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input required={false} name="currentPassword" placeholder="Senha atual, caso altere o e-mail" type="password" minLength={8} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            <div className="sm:col-span-2 sm:justify-self-start">
              <SubmitButton disabled={savingProfile}><Save size={18} /> Salvar dados</SubmitButton>
            </div>
          </form>
        </Panel>

        <Panel title="Alterar senha">
          <form onSubmit={submitPassword} className="grid gap-3 sm:grid-cols-2">
            <Input name="currentPassword" placeholder="Senha atual" type="password" minLength={8} />
            <span className="hidden sm:block" />
            <Input name="newPassword" placeholder="Nova senha" type="password" minLength={8} />
            <Input name="passwordConfirmation" placeholder="Confirmar nova senha" type="password" minLength={8} />
            <div className="sm:col-span-2 sm:justify-self-start">
              <SubmitButton disabled={savingPassword}><KeyRound size={18} /> Alterar senha</SubmitButton>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

export function Metric({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: "blue" | "green" | "red" | "slate" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    red: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
  };
  return (
    <article className={`metric-card metric-${tone} animate-rise rounded-xl p-5`}>
      <div className={`mb-6 grid h-11 w-11 place-items-center rounded-lg ${tones[tone]}`}>{icon}</div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <strong className="mt-2 block text-2xl font-semibold">{value}</strong>
    </article>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface-panel animate-rise rounded-xl p-5">
      <h2 className="panel-title mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function TransactionList({
  transactions,
  categories,
  selectedIds,
  onSelectionChange,
  onUpload,
  onDownload,
  onUpdate,
  onRemove
}: {
  transactions: Transaction[];
  categories?: Category[];
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onUpload?: (transactionId: string, file: File) => Promise<void>;
  onDownload?: (attachment: { id: string; filename: string }) => Promise<void>;
  onUpdate?: (transactionId: string, payload: Record<string, number | string | undefined>) => Promise<void>;
  onRemove?: (transaction: Transaction) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<Transaction["type"]>("EXPENSE");

  if (!transactions.length) {
    return <EmptyState text="Nenhuma movimentacao encontrada para este filtro." />;
  }

  return (
    <div className="space-y-3">
      {transactions.map((item) => {
        const isEditing = editingId === item.id;

        if (isEditing && categories && onUpdate) {
          const editCategories = categories.filter((category) => categoryMatchesTransactionType(category, editingType));

          return (
            <form
              key={item.id}
              className="grid gap-3 rounded-lg border border-blue-100 p-3 dark:border-blue-500/30 sm:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                await onUpdate(item.id, {
                  description: String(form.get("description")),
                  amount: Number(form.get("amount")),
                  type: String(form.get("type")),
                  date: String(form.get("date")),
                  categoryId: String(form.get("categoryId") || "") || undefined
                });
                setEditingId(null);
              }}
            >
              <Input name="description" defaultValue={item.description} />
              <Input name="amount" type="number" step="0.01" defaultValue={Number(item.amount)} />
              <Select name="type" value={editingType} onChange={(value) => setEditingType(value as Transaction["type"])} options={[["INCOME", "Receita"], ["EXPENSE", "Despesa"]]} />
              <Select name="categoryId" defaultValue={item.category?.id ?? ""} options={[["", "Sem categoria"], ...editCategories.map((category) => [category.id, category.name] as [string, string])]} />
              <Input name="date" type="date" defaultValue={String(item.date).slice(0, 10)} />
              <div className="flex gap-2">
                <button className="grid h-11 w-11 place-items-center rounded-lg bg-blue-600 text-white" title="Salvar" aria-label="Salvar">
                  <Save size={17} />
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200" title="Cancelar" aria-label="Cancelar">
                  <X size={17} />
                </button>
              </div>
            </form>
          );
        }

        return (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-transparent">
            {onSelectionChange && <input type="checkbox" checked={selectedIds?.includes(item.id) ?? false} onChange={(event) => onSelectionChange(event.target.checked ? [...(selectedIds ?? []), item.id] : (selectedIds ?? []).filter((id) => id !== item.id))} className="h-4 w-4 accent-blue-600" />}
            <div>
              <p className="font-medium">{item.description}</p>
              <p className="text-sm text-slate-500">{item.category?.name ?? "Sem categoria"} - {dateLabel(item.date)}</p>
              {item.tags?.length ? <p className="mt-1 text-xs text-blue-600">{item.tags.map(({ tag }) => `#${tag.name}`).join(" ")}</p> : null}
              {item.attachments?.length ? <p className="mt-1 flex flex-wrap gap-2 text-xs text-blue-600">{item.attachments.map((attachment) => <button key={attachment.id} onClick={() => void onDownload?.(attachment)} className="underline">{attachment.filename}</button>)}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <span className={item.type === "INCOME" ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>
                {item.type === "INCOME" ? "+" : "-"} {money(item.amount)}
              </span>
              {onUpdate && <ActionButton label="Editar movimentacao" onClick={() => {
                setEditingType(item.type);
                setEditingId(item.id);
              }}><Edit3 size={16} /></ActionButton>}
              {onUpload && <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300" title="Anexar comprovante"><Paperclip size={16} /><input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(item.id, file); event.target.value = ""; }} /></label>}
              {onRemove && <IconButton label="Remover movimentacao" onClick={() => onRemove(item)} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BillRow({
  bill,
  onStatusChange,
  onRemove
}: {
  bill: Bill;
  onStatusChange?: (bill: Bill) => Promise<void>;
  onRemove?: (bill: Bill) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-transparent sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{bill.title}</p>
          {bill.isRecurring && <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Todo mes</span>}
          <span className={bill.status === "PAID" ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300"}>
            {bill.status === "PAID" ? "Paga" : "Pendente"}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {dateLabel(bill.dueDate)}
          {bill.isRecurring && bill.recurrenceDay ? ` - repete dia ${bill.recurrenceDay}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <span className="font-semibold">{money(bill.amount)}</span>
        {onStatusChange && (
          <button
            onClick={() => onStatusChange(bill)}
            className={bill.status === "PAID" ? "h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800" : "h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700"}
          >
            {bill.status === "PAID" ? "Marcar pendente" : "Marcar paga"}
          </button>
        )}
        {onRemove && <IconButton label="Remover conta" onClick={() => onRemove(bill)} />}
      </div>
    </div>
  );
}

export function GoalList({
  goals,
  onAddAmount,
  onRemove
}: {
  goals: Goal[];
  onAddAmount?: (goalId: string, amount: number) => Promise<void>;
  onRemove?: (goal: Goal) => void;
}) {
  if (!goals.length) {
    return <EmptyState text="Nenhuma meta criada ainda." />;
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const percent = Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100);
        return (
          <div key={goal.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-transparent">
            <div className="mb-2 flex justify-between gap-4 text-sm">
              <span className="font-medium">{goal.title}</span>
              <div className="flex items-center gap-2">
                <span>{Math.round(percent)}%</span>
                {onRemove && <IconButton label="Remover meta" onClick={() => onRemove(goal)} />}
              </div>
            </div>
            <div className="mb-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>{money(goal.currentAmount)}</span>
              <span>{money(goal.targetAmount)}</span>
            </div>
            {onAddAmount && (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const amount = Number(form.get("amount"));
                  if (!amount || amount <= 0) return;
                  onAddAmount(goal.id, amount);
                  event.currentTarget.reset();
                }}
              >
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Adicionar valor"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950"
                />
                <button className="h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700">Adicionar</button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ToastMessage({ toast }: { toast: Exclude<Toast, null> }) {
  const isSuccess = toast.type === "success";

  return (
    <div className="fixed right-4 top-4 z-50 w-[calc(100vw-2rem)] max-w-sm animate-rise rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className={isSuccess ? "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}>
          {isSuccess ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
        </span>
        <div>
          <p className="font-semibold">{isSuccess ? "Acao concluida" : "Algo deu errado"}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{toast.message}</p>
        </div>
      </div>
    </div>
  );
}

export function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
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
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-400">{text}</div>;
}

export function Pagination({ pagination, onPageChange }: { pagination: PaginatedTransactions; onPageChange: (page: number) => Promise<void> }) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">
        Pagina {pagination.page} de {pagination.totalPages} - {pagination.total} registros
      </span>
      <div className="flex gap-2">
        <button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800">
          Anterior
        </button>
        <button disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)} className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800">
          Proxima
        </button>
      </div>
    </div>
  );
}

export function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
      {children}
    </button>
  );
}

export function SubmitButton({ disabled, children }: { disabled?: boolean; children: ReactNode }) {
  return (
    <button disabled={disabled} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
      {disabled ? "Salvando..." : children}
    </button>
  );
}

export function transactionParams(filters: TransactionFilters, page: number, requestId?: number) {
  return {
    month: filters.month || undefined,
    year: filters.year || undefined,
    type: filters.type || undefined,
    search: filters.search.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    tagId: filters.tagId || undefined,
    minAmount: filters.minAmount || undefined,
    maxAmount: filters.maxAmount || undefined,
    page,
    pageSize: 10,
    _t: requestId
  };
}

export function categoryMatchesTransactionType(category: Category, type: Transaction["type"]) {
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
  return Number(investment.currentValue) * (getEffectiveMonthlyRate(investment) / 100);
}

export function investmentTypeLabel(type: Investment["type"]) {
  const labels: Record<Investment["type"], string> = {
    STOCK: "Acoes",
    CRYPTO: "Criptomoedas",
    FIXED_INCOME: "Renda fixa",
    EMERGENCY_RESERVE: "Reserva",
    OTHER: "Outro"
  };

  return labels[type];
}

export function buildFinancialAdvice(dashboard: DashboardData) {
  const income = dashboard.cards.monthIncome;
  const expenses = dashboard.cards.monthExpense;
  const investments = dashboard.cards.investments;
  const pendingBills = dashboard.bills.filter((bill) => bill.status === "PENDING");
  const recurringBillsTotal = dashboard.bills.filter((bill) => bill.isRecurring).reduce((sum, bill) => sum + Number(bill.amount), 0);
  const goalsCurrent = dashboard.goals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
  const goalsTarget = dashboard.goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);
  const highestCategory = [...dashboard.categorySummary].sort((a, b) => b.value - a.value)[0];
  const savings = income - expenses;

  const advice = [
    {
      title: savings >= 0 ? "Seu mes esta positivo" : "Seu mes esta no vermelho",
      description:
        savings >= 0
          ? `Voce esta com uma sobra estimada de ${money(savings)} neste mes. Uma boa divisao seria direcionar parte para metas e parte para reserva.`
          : `Suas despesas superam receitas em ${money(Math.abs(savings))}. Priorize reduzir gastos variaveis antes de assumir novas contas recorrentes.`,
      tone: savings >= 0 ? "success" : "danger"
    }
  ];

  if (highestCategory) {
    advice.push({
      title: `Categoria que mais pesa: ${highestCategory.name}`,
      description: `Essa categoria soma ${money(highestCategory.value)}. Revise os lancamentos dela e defina um teto mensal para controlar melhor o fluxo.`,
      tone: "info"
    });
  }

  if (pendingBills.length) {
    advice.push({
      title: "Agenda com pendencias",
      description: `Voce tem ${pendingBills.length} conta(s) pendente(s). Marcar as pagas ajuda o dashboard a refletir suas despesas reais do mes.`,
      tone: "info"
    });
  }

  if (recurringBillsTotal > income * 0.4 && income > 0) {
    advice.push({
      title: "Contas fixas elevadas",
      description: `Suas contas recorrentes somam ${money(recurringBillsTotal)}, acima de 40% da renda mensal. Vale revisar assinaturas, aluguel e contratos fixos.`,
      tone: "danger"
    });
  }

  if (goalsTarget > 0) {
    advice.push({
      title: "Plano para metas",
      description: `Voce ja acumulou ${money(goalsCurrent)} de ${money(goalsTarget)} em metas. Se reservar ${money(Math.max(savings * 0.3, 0))} por mes, acelera o progresso sem apertar demais o caixa.`,
      tone: "success"
    });
  }

  if (investments <= expenses && expenses > 0) {
    advice.push({
      title: "Reserva financeira",
      description: "Seu total investido ainda nao cobre um mes de despesas. Considere priorizar reserva de emergencia antes de aumentar risco em cripto ou acoes.",
      tone: "info"
    });
  }

  return advice;
}

export function Input({ required = true, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} required={required} className="h-11 rounded-lg border border-slate-300 bg-white px-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none" />;
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  options: Array<[string, string]>;
  onChange?: (value: string) => void;
};

export function Select({ options, onChange, ...props }: SelectProps) {
  return (
    <select {...props} onChange={(event) => onChange?.(event.target.value)} className="h-11 rounded-lg border border-slate-300 bg-white px-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );
}
