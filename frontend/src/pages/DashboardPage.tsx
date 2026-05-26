import { FormEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useEffect, useMemo, useState } from "react";
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
  Download,
  Edit3,
  LayoutDashboard,
  LogOut,
  Moon,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  Save,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  WalletCards,
  X
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Bill, Category, DashboardData, Goal, Investment, PaginatedTransactions, Transaction } from "../types/finance";
import { dateLabel, money } from "../utils/format";

type ViewKey = "overview" | "transactions" | "agenda" | "investments" | "goals" | "ai";
type Toast = { type: "success" | "error"; message: string } | null;
type RefreshedData = {
  dashboard: DashboardData;
  transactions: PaginatedTransactions;
};

const emptyDashboard: DashboardData = {
  cards: { balance: 0, monthIncome: 0, monthExpense: 0, investments: 0 },
  monthlySeries: [],
  categorySummary: [],
  goals: [],
  bills: [],
  investmentsList: [],
  recentTransactions: []
};

const emptyTransactions: PaginatedTransactions = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1
};

const menuItems: Array<{ key: ViewKey; label: string; icon: ReactNode }> = [
  { key: "overview", label: "Dashboard", icon: <LayoutDashboard size={21} /> },
  { key: "transactions", label: "Movimentacoes", icon: <ReceiptText size={21} /> },
  { key: "agenda", label: "Agenda", icon: <CalendarClock size={21} /> },
  { key: "investments", label: "Investimentos", icon: <TrendingUp size={21} /> },
  { key: "goals", label: "Metas", icon: <Target size={21} /> },
  { key: "ai", label: "Conselho de IA", icon: <BrainCircuit size={21} /> }
];

const viewTitles: Record<ViewKey, { title: string; subtitle: string }> = {
  overview: { title: "Dashboard financeiro", subtitle: "Visao geral do seu mes e patrimonio." },
  transactions: { title: "Movimentacoes", subtitle: "Receitas, despesas, categorias e historico recente." },
  agenda: { title: "Agenda financeira", subtitle: "Contas a pagar, contas pagas e compromissos recorrentes." },
  investments: { title: "Investimentos", subtitle: "Aportes, patrimonio investido e rentabilidade." },
  goals: { title: "Metas financeiras", subtitle: "Objetivos, reserva, compras planejadas e progresso." },
  ai: { title: "Conselho de IA", subtitle: "Analise automatica para melhorar seu controle financeiro." }
};

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: String(new Date().getMonth() + 1), type: "", search: "" });
  const [transactionsPage, setTransactionsPage] = useState(emptyTransactions);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function loadData(page = transactionsPage.page || 1): Promise<RefreshedData> {
    setRefreshing(true);
    const requestId = Date.now();
    try {
      const [dashboardResponse, categoriesResponse, transactionsResponse, billsResponse, goalsResponse, investmentsResponse] = await Promise.allSettled([
        api.get("/dashboard", { params: { _t: requestId } }),
        api.get("/categories", { params: { _t: requestId } }),
        api.get("/transactions", { params: transactionParams(filters, page, requestId) }),
        api.get("/bills", { params: { _t: requestId } }),
        api.get("/goals", { params: { _t: requestId } }),
        api.get("/investments", { params: { _t: requestId } })
      ]);

      const nextDashboard: DashboardData = {
        ...(dashboardResponse.status === "fulfilled" ? dashboardResponse.value.data : dashboard),
        bills: billsResponse.status === "fulfilled" ? billsResponse.value.data : dashboard.bills,
        goals: goalsResponse.status === "fulfilled" ? goalsResponse.value.data : dashboard.goals,
        investmentsList: investmentsResponse.status === "fulfilled" ? investmentsResponse.value.data : dashboard.investmentsList
      };

      setDashboard(nextDashboard);

      if (categoriesResponse.status === "fulfilled") {
        setCategories(categoriesResponse.value.data);
      }

      const nextTransactions = transactionsResponse.status === "fulfilled" ? transactionsResponse.value.data : transactionsPage;

      if (transactionsResponse.status === "fulfilled") {
        setTransactionsPage(nextTransactions);
      }

      return { dashboard: nextDashboard, transactions: nextTransactions };
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshAfterMutation(): Promise<RefreshedData | null> {
    try {
      return await loadData(transactionsPage.page || 1);
    } catch {
      // A gravacao ja terminou; falha de refresh nao deve virar erro de salvamento.
      return null;
    }
  }

  async function loadTransactions(page = transactionsPage.page) {
    const response = await api.get("/transactions", { params: transactionParams(filters, page, Date.now()) });
    setTransactionsPage(response.data);
  }

  useEffect(() => {
    loadData(1);
  }, []);

  useEffect(() => {
    function refreshOnFocus() {
      if (document.visibilityState === "visible") {
        loadData(transactionsPage.page || 1);
      }
    }

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [filters, transactionsPage.page]);

  const expenseCategories = useMemo(() => categories.filter((category) => category.type !== "INCOME"), [categories]);
  const incomeCategories = useMemo(() => categories.filter((category) => category.type !== "EXPENSE"), [categories]);

  useEffect(() => {
    if (!loading) loadTransactions(1);
  }, [filters]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!saving && !refreshing && document.visibilityState === "visible") {
        loadData(transactionsPage.page || 1);
      }
    }, 10000);

    return () => window.clearInterval(interval);
  }, [filters, refreshing, saving, transactionsPage.page]);

  function notify(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const previousTotal = transactionsPage.total;
    try {
      setSaving(true);
      await api.post("/transactions", {
        description: form.get("description"),
        amount: Number(form.get("amount")),
        type: form.get("type"),
        date: form.get("date"),
        categoryId: form.get("categoryId") || undefined
      });
      event.currentTarget.reset();
      await refreshAfterMutation();
      notify("success", "Movimentacao registrada com sucesso.");
    } catch {
      const refreshed = await refreshAfterMutation();
      notify(refreshed && refreshed.transactions.total > previousTotal ? "success" : "error", refreshed && refreshed.transactions.total > previousTotal ? "Movimentacao registrada com sucesso." : "Nao foi possivel registrar a movimentacao.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTransaction(transactionId: string, payload: Record<string, number | string | undefined>) {
    try {
      setSaving(true);
      await api.patch(`/transactions/${transactionId}`, payload);
      await refreshAfterMutation();
      notify("success", "Movimentacao atualizada.");
    } catch {
      notify("error", "Nao foi possivel atualizar a movimentacao.");
    } finally {
      setSaving(false);
    }
  }

  async function submitInvestment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const previousCount = dashboard.investmentsList.length;
    try {
      setSaving(true);
      await api.post("/investments", {
        name: form.get("name"),
        type: form.get("type"),
        ...readInvestmentPayload(form)
      });
      event.currentTarget.reset();
      await refreshAfterMutation();
      notify("success", "Investimento registrado com sucesso.");
    } catch {
      const refreshed = await refreshAfterMutation();
      notify(refreshed && refreshed.dashboard.investmentsList.length > previousCount ? "success" : "error", refreshed && refreshed.dashboard.investmentsList.length > previousCount ? "Investimento registrado com sucesso." : "Nao foi possivel registrar o investimento.");
    } finally {
      setSaving(false);
    }
  }

  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const previousCount = dashboard.goals.length;
    try {
      setSaving(true);
      await api.post("/goals", {
        title: form.get("title"),
        targetAmount: Number(form.get("targetAmount")),
        currentAmount: Number(form.get("currentAmount") || 0),
        deadline: form.get("deadline") || undefined
      });
      event.currentTarget.reset();
      await refreshAfterMutation();
      notify("success", "Meta criada com sucesso.");
    } catch {
      const refreshed = await refreshAfterMutation();
      notify(refreshed && refreshed.dashboard.goals.length > previousCount ? "success" : "error", refreshed && refreshed.dashboard.goals.length > previousCount ? "Meta criada com sucesso." : "Nao foi possivel criar a meta.");
    } finally {
      setSaving(false);
    }
  }

  async function submitBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isRecurring = form.get("isRecurring") === "on";
    const dueDate = String(form.get("dueDate"));
    const previousCount = dashboard.bills.length;

    try {
      setSaving(true);
      await api.post("/bills", {
        title: form.get("title"),
        amount: Number(form.get("amount")),
        dueDate,
        status: form.get("status"),
        isRecurring,
        recurrenceDay: isRecurring ? new Date(`${dueDate}T00:00:00`).getDate() : undefined
      });
      event.currentTarget.reset();
      await refreshAfterMutation();
      notify("success", "Conta salva na agenda.");
    } catch {
      const refreshed = await refreshAfterMutation();
      notify(refreshed && refreshed.dashboard.bills.length > previousCount ? "success" : "error", refreshed && refreshed.dashboard.bills.length > previousCount ? "Conta salva na agenda." : "Nao foi possivel salvar a conta.");
    } finally {
      setSaving(false);
    }
  }

  async function updateBillStatus(bill: Bill) {
    const nextStatus = bill.status === "PAID" ? "PENDING" : "PAID";
    try {
      setSaving(true);
      await api.patch(`/bills/${bill.id}`, { status: nextStatus });
      await refreshAfterMutation();
      notify("success", nextStatus === "PAID" ? "Conta marcada como paga e somada nas despesas." : "Conta voltou para pendente.");
    } catch {
      notify("error", "Nao foi possivel atualizar a conta.");
    } finally {
      setSaving(false);
    }
  }

  async function addGoalAmount(goalId: string, amount: number) {
    try {
      setSaving(true);
      await api.patch(`/goals/${goalId}`, { addAmount: amount });
      await refreshAfterMutation();
      notify("success", "Valor adicionado a meta.");
    } catch {
      notify("error", "Nao foi possivel atualizar a meta.");
    } finally {
      setSaving(false);
    }
  }

  async function updateInvestment(investmentId: string, payload: Record<string, number | string | undefined>) {
    try {
      setSaving(true);
      await api.patch(`/investments/${investmentId}`, payload);
      await refreshAfterMutation();
      notify("success", payload.addContribution ? "Aporte adicionado ao investimento." : "Investimento atualizado.");
    } catch {
      notify("error", "Nao foi possivel atualizar o investimento.");
    } finally {
      setSaving(false);
    }
  }

  async function removeResource(resource: "transactions" | "bills" | "goals" | "investments", id: string, successMessage: string) {
    if (!window.confirm("Tem certeza que deseja remover este item?")) {
      return;
    }

    try {
      setSaving(true);
      await api.delete(`/${resource}/${id}`);
      await refreshAfterMutation();
      notify("success", successMessage);
    } catch {
      notify("error", "Nao foi possivel remover este item.");
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    try {
      const response = await api.get("/transactions/export.csv", {
        params: transactionParams(filters, 1, Date.now()),
        responseType: "blob"
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "movimentacoes.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      notify("error", "Nao foi possivel exportar o CSV.");
    }
  }

  async function exportPdf() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatorio Financeiro", 14, 20);
    doc.setFontSize(11);
    doc.text(`Usuario: ${user?.name ?? ""}`, 14, 32);
    doc.text(`Saldo total: ${money(dashboard.cards.balance)}`, 14, 42);
    doc.text(`Receitas do mes: ${money(dashboard.cards.monthIncome)}`, 14, 52);
    doc.text(`Despesas do mes: ${money(dashboard.cards.monthExpense)}`, 14, 62);
    doc.text(`Investimentos: ${money(dashboard.cards.investments)}`, 14, 72);
    doc.save("relatorio-financeiro.pdf");
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">Carregando painel financeiro...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      {toast && <ToastMessage toast={toast} />}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:block">
        <div className="flex h-20 items-center gap-3 px-5 text-blue-600">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-600 text-white">
            <WalletCards size={22} />
          </span>
          <div>
            <p className="font-semibold text-slate-950 dark:text-white">Financas</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Painel pessoal</p>
          </div>
        </div>
        <nav className="grid gap-2 px-3">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                activeView === item.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
              }`}
              title={item.label}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/85 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ola, {user?.name}</p>
              <h1 className="text-2xl font-semibold">{viewTitles[activeView].title}</h1>
              <p className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
                {viewTitles[activeView].subtitle}
                {refreshing && <span className="ml-2 text-blue-600 dark:text-blue-300">Atualizando...</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportPdf} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" title="Exportar PDF">
                <Download size={18} />
              </button>
              <button onClick={() => setDark((value) => !value)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" title="Alternar tema">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950" title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
                  activeView === item.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {activeView === "overview" && <Overview dashboard={dashboard} onBillStatusChange={updateBillStatus} />}
          {activeView === "transactions" && (
            <TransactionsView
              categories={[...incomeCategories, ...expenseCategories]}
              filters={filters}
              setFilters={setFilters}
              transactions={transactionsPage.items}
              pagination={transactionsPage}
              saving={saving}
              onSubmit={submitTransaction}
              onUpdate={updateTransaction}
              onRemove={(transaction) => removeResource("transactions", transaction.id, "Movimentacao removida.")}
              onPageChange={loadTransactions}
              onExportCsv={exportCsv}
            />
          )}
          {activeView === "agenda" && <AgendaView bills={dashboard.bills} saving={saving} onSubmit={submitBill} onBillStatusChange={updateBillStatus} onRemove={(bill) => removeResource("bills", bill.id, "Conta removida da agenda.")} />}
          {activeView === "investments" && <InvestmentsView investments={dashboard.investmentsList} monthlySeries={dashboard.monthlySeries} saving={saving} onSubmit={submitInvestment} onUpdate={updateInvestment} onRemove={(investment) => removeResource("investments", investment.id, "Investimento removido.")} />}
          {activeView === "goals" && <GoalsView goals={dashboard.goals} saving={saving} onSubmit={submitGoal} onAddAmount={addGoalAmount} onRemove={(goal) => removeResource("goals", goal.id, "Meta removida.")} />}
          {activeView === "ai" && <AiAdviceView dashboard={dashboard} />}
        </div>
      </section>
    </main>
  );
}

function Overview({ dashboard, onBillStatusChange }: { dashboard: DashboardData; onBillStatusChange: (bill: Bill) => Promise<void> }) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Saldo total" value={money(dashboard.cards.balance)} icon={<WalletCards />} tone="blue" />
        <Metric title="Receitas do mes" value={money(dashboard.cards.monthIncome)} icon={<ArrowUpCircle />} tone="green" />
        <Metric title="Despesas do mes" value={money(dashboard.cards.monthExpense)} icon={<ArrowDownCircle />} tone="red" />
        <Metric title="Investimentos" value={money(dashboard.cards.investments)} icon={<PiggyBank />} tone="slate" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <Panel title="Fluxo financeiro">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.monthlySeries}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Area type="monotone" dataKey="receitas" stroke="#2563eb" fill="url(#income)" strokeWidth={3} />
                <Area type="monotone" dataKey="despesas" stroke="#ef4444" fill="#ef444422" strokeWidth={3} />
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
                    <Cell key={entry.name} fill={entry.color ?? "#2563eb"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Proximas contas">
          {dashboard.bills.slice(0, 5).map((bill) => (
            <BillRow key={bill.id} bill={bill} onStatusChange={onBillStatusChange} />
          ))}
        </Panel>
        <Panel title="Metas em progresso">
          <GoalList goals={dashboard.goals.slice(0, 4)} />
        </Panel>
      </section>
    </div>
  );
}

function TransactionsView({
  categories,
  filters,
  setFilters,
  transactions,
  pagination,
  saving,
  onSubmit,
  onUpdate,
  onRemove,
  onPageChange,
  onExportCsv
}: {
  categories: Category[];
  filters: { month: string; type: string; search: string };
  setFilters: (filters: { month: string; type: string; search: string }) => void;
  transactions: Transaction[];
  pagination: PaginatedTransactions;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdate: (transactionId: string, payload: Record<string, number | string | undefined>) => Promise<void>;
  onRemove: (transaction: Transaction) => void;
  onPageChange: (page: number) => Promise<void>;
  onExportCsv: () => Promise<void>;
}) {
  const [newTransactionType, setNewTransactionType] = useState<Transaction["type"]>("EXPENSE");
  const newTransactionCategories = categories.filter((category) => categoryMatchesTransactionType(category, newTransactionType));

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

      <Panel title="Historico do mes">
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <Search size={16} />
            <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className="bg-transparent outline-none">
              {Array.from({ length: 12 }).map((_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
            </select>
          </label>
          <Select name="filterType" value={filters.type} onChange={(value) => setFilters({ ...filters, type: value })} options={[["", "Todos"], ["INCOME", "Receitas"], ["EXPENSE", "Despesas"]]} />
          <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900" />
          <button type="button" onClick={onExportCsv} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800">
            <Download size={16} /> CSV
          </button>
        </div>
        <TransactionList transactions={transactions} categories={categories} onUpdate={onUpdate} onRemove={onRemove} />
        <Pagination pagination={pagination} onPageChange={onPageChange} />
      </Panel>
    </div>
  );
}

function AgendaView({
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

function InvestmentsView({
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

function InvestmentCard({
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
    <div className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
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

function InvestmentFields({ type, investment, compact = false }: { type: Investment["type"]; investment?: Investment; compact?: boolean }) {
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

function InvestmentDetails({ investment }: { investment: Investment }) {
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

function readInvestmentPayload(form: FormData) {
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

function investmentNamePlaceholder(type: Investment["type"]) {
  const placeholders: Record<Investment["type"], string> = {
    STOCK: "Nome da acao ou FII",
    CRYPTO: "Nome da criptomoeda",
    FIXED_INCOME: "Nome do titulo",
    EMERGENCY_RESERVE: "Nome da reserva",
    OTHER: "Nome do investimento"
  };

  return placeholders[type];
}

function numberFromForm(form: FormData, name: string, fallback?: number) {
  const value = form.get(name);
  if (value === null || value === "") return fallback ?? 0;
  return Number(value);
}

function optionalNumberFromForm(form: FormData, name: string) {
  const value = form.get(name);
  return value === null || value === "" ? undefined : Number(value);
}

function textFromForm(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  return value || undefined;
}

function numberDefault(value: string | number | undefined) {
  return value === undefined || value === null ? "" : Number(value);
}

function GoalsView({
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

function AiAdviceView({ dashboard }: { dashboard: DashboardData }) {
  const advice = buildFinancialAdvice(dashboard);
  const expenseRatio = dashboard.cards.monthIncome > 0 ? Math.round((dashboard.cards.monthExpense / dashboard.cards.monthIncome) * 100) : 0;
  const goalProgress = dashboard.goals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
  const goalTarget = dashboard.goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Gastos / receita" value={`${expenseRatio}%`} icon={<ReceiptText />} tone={expenseRatio > 80 ? "red" : "blue"} />
        <Metric title="Metas guardadas" value={money(goalProgress)} icon={<Target />} tone="green" />
        <Metric title="Falta para metas" value={money(Math.max(goalTarget - goalProgress, 0))} icon={<PiggyBank />} tone="slate" />
      </section>

      <Panel title="Recomendacoes inteligentes">
        <div className="grid gap-3">
          {advice.map((item) => (
            <article key={item.title} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
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

function Metric({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: "blue" | "green" | "red" | "slate" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    red: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
  };
  return (
    <article className="animate-rise rounded-lg border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-6 grid h-11 w-11 place-items-center rounded-lg ${tones[tone]}`}>{icon}</div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <strong className="mt-2 block text-2xl font-semibold">{value}</strong>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="animate-rise rounded-lg border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function TransactionList({
  transactions,
  categories,
  onUpdate,
  onRemove
}: {
  transactions: Transaction[];
  categories?: Category[];
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
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
            <div>
              <p className="font-medium">{item.description}</p>
              <p className="text-sm text-slate-500">{item.category?.name ?? "Sem categoria"} - {dateLabel(item.date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={item.type === "INCOME" ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>
                {item.type === "INCOME" ? "+" : "-"} {money(item.amount)}
              </span>
              {onUpdate && <ActionButton label="Editar movimentacao" onClick={() => {
                setEditingType(item.type);
                setEditingId(item.id);
              }}><Edit3 size={16} /></ActionButton>}
              {onRemove && <IconButton label="Remover movimentacao" onClick={() => onRemove(item)} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BillRow({
  bill,
  onStatusChange,
  onRemove
}: {
  bill: Bill;
  onStatusChange?: (bill: Bill) => Promise<void>;
  onRemove?: (bill: Bill) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
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

function GoalList({
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
          <div key={goal.id} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
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

function ToastMessage({ toast }: { toast: Exclude<Toast, null> }) {
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

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
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

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">{text}</div>;
}

function Pagination({ pagination, onPageChange }: { pagination: PaginatedTransactions; onPageChange: (page: number) => Promise<void> }) {
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

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
      {children}
    </button>
  );
}

function SubmitButton({ disabled, children }: { disabled?: boolean; children: ReactNode }) {
  return (
    <button disabled={disabled} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
      {disabled ? "Salvando..." : children}
    </button>
  );
}

function transactionParams(filters: { month: string; type: string; search: string }, page: number, requestId?: number) {
  return {
    month: filters.month || undefined,
    type: filters.type || undefined,
    search: filters.search || undefined,
    page,
    pageSize: 10,
    _t: requestId
  };
}

function categoryMatchesTransactionType(category: Category, type: Transaction["type"]) {
  if (type === "INCOME") return category.type !== "EXPENSE";
  return category.type !== "INCOME";
}

function getEffectiveMonthlyRate(investment: Investment) {
  const cdiMonthlyRate = Number(investment.cdiMonthlyRate ?? 0);
  const cdiPercent = Number(investment.cdiPercent ?? 100);
  const manualRate = Number(investment.monthlyYieldRate ?? 0);

  if (cdiMonthlyRate > 0) {
    return cdiMonthlyRate * (cdiPercent / 100);
  }

  return manualRate;
}

function estimateMonthlyReturn(investment: Investment) {
  return Number(investment.currentValue) * (getEffectiveMonthlyRate(investment) / 100);
}

function investmentTypeLabel(type: Investment["type"]) {
  const labels: Record<Investment["type"], string> = {
    STOCK: "Acoes",
    CRYPTO: "Criptomoedas",
    FIXED_INCOME: "Renda fixa",
    EMERGENCY_RESERVE: "Reserva",
    OTHER: "Outro"
  };

  return labels[type];
}

function buildFinancialAdvice(dashboard: DashboardData) {
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

function Input({ required = true, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} required={required} className="h-11 rounded-lg border border-slate-200 bg-white px-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950" />;
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  options: Array<[string, string]>;
  onChange?: (value: string) => void;
};

function Select({ options, onChange, ...props }: SelectProps) {
  return (
    <select {...props} onChange={(event) => onChange?.(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950">
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );
}
