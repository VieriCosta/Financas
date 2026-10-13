import { FormEvent, ReactNode, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
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
import { Overview, MiniStat, TransactionsView, AgendaView, PlanningView, InsightsView, InvestmentsView, InvestmentCard, InvestmentFields, InvestmentDetails, readInvestmentPayload, investmentNamePlaceholder, numberFromForm, optionalNumberFromForm, textFromForm, numberDefault, GoalsView, AiAdviceView, AiMessageForm, AiAnswer, aiResourceLabel, ProfileView, Metric, Panel, TransactionList, BillRow, GoalList, ToastMessage, IconButton, EmptyState, Pagination, ActionButton, SubmitButton, transactionParams, categoryMatchesTransactionType, getApiErrorMessage, getEffectiveMonthlyRate, estimateMonthlyReturn, investmentTypeLabel, buildFinancialAdvice, Input, Select } from "../components/DashboardViews";

const AccountsPage = lazy(() => import("./AccountsPage"));
const CardsPage = lazy(() => import("./CardsPage"));
const ImportPage = lazy(() => import("./ImportPage"));
const ReportsPage = lazy(() => import("./ReportsPage"));
const BackupPage = lazy(() => import("./BackupPage"));
const SettingsPage = lazy(() => import("./SettingsPage"));
type ViewKey = "overview" | "transactions" | "agenda" | "planning" | "insights" | "investments" | "goals" | "ai" | "profile" | "accounts" | "cards" | "import" | "reports" | "backup" | "settings";
const emptyDashboard: DashboardData = {
  cards: { balance: 0, monthIncome: 0, monthExpense: 0, investments: 0, projectedBalance: 0 },
  projection: { currentBalance: 0, projectedBalance: 0, scheduledBalance: 0, pendingBillTotal: 0, periodDays: 30 },
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
  { key: "accounts", label: "Contas e carteiras", icon: <WalletCards size={21} /> },
  { key: "cards", label: "Cartoes e faturas", icon: <ReceiptText size={21} /> },
  { key: "import", label: "Importar extrato", icon: <Download size={21} /> },
  { key: "reports", label: "Relatorios", icon: <TrendingUp size={21} /> },
  { key: "backup", label: "Backup dos dados", icon: <ShieldCheck size={21} /> },
  { key: "settings", label: "Categorias e tags", icon: <SlidersHorizontal size={21} /> },
  { key: "agenda", label: "Agenda", icon: <CalendarClock size={21} /> },
  { key: "planning", label: "Planejamento", icon: <PiggyBank size={21} /> },
  { key: "insights", label: "Insights", icon: <SlidersHorizontal size={21} /> },
  { key: "investments", label: "Investimentos", icon: <TrendingUp size={21} /> },
  { key: "goals", label: "Metas", icon: <Target size={21} /> },
  { key: "ai", label: "Conselho de IA", icon: <BrainCircuit size={21} /> }
];

const viewTitles: Record<ViewKey, { title: string; subtitle: string }> = {
  accounts: { title: "Contas e carteiras", subtitle: "Saldos iniciais, movimentacoes e transferencias." },
  cards: { title: "Cartoes e faturas", subtitle: "Compras, parcelas, limite e pagamento de faturas." },
  import: { title: "Importacao e conciliacao", subtitle: "Revise seu extrato e evite registros duplicados." },
  reports: { title: "Relatorios financeiros", subtitle: "Compare periodos e acompanhe resultados por categoria." },
  backup: { title: "Backup dos dados", subtitle: "Exporte e restaure seus registros financeiros." },
  settings: { title: "Categorias e tags", subtitle: "Organize e arquive sem perder seu historico." },
  overview: { title: "Dashboard financeiro", subtitle: "Visao geral do seu mes e patrimonio." },
  transactions: { title: "Movimentacoes", subtitle: "Receitas, despesas, categorias e historico recente." },
  agenda: { title: "Agenda financeira", subtitle: "Contas a pagar, contas pagas e compromissos recorrentes." },
  planning: { title: "Planejamento", subtitle: "Parcelas, limites por categoria e regras recorrentes." },
  insights: { title: "Insights financeiros", subtitle: "Fechamento mensal, alertas, reserva e configuracao do painel." },
  investments: { title: "Investimentos", subtitle: "Aportes, patrimonio investido e rentabilidade." },
  goals: { title: "Metas financeiras", subtitle: "Objetivos, reserva, compras planejadas e progresso." },
  ai: { title: "Conselho de IA", subtitle: "Analise automatica para melhorar seu controle financeiro." },
  profile: { title: "Meu perfil", subtitle: "Dados pessoais e seguranca da sua conta." }
};

export function DashboardPage() {
  const { user, logout, updateUser } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [preference, setPreference] = useState<DashboardPreference>({ hiddenWidgets: [], widgetOrder: ["metrics", "charts", "alerts", "bills", "goals"], chartMonths: 6 });
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [dark, setDark] = useState(() => localStorage.getItem("finance.theme") !== "light");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), type: "", search: "", categoryId: "", tagId: "", minAmount: "", maxAmount: "", accountId: "", reconciled: "" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(emptyTransactions);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const dashboardRequest = useRef(0);
  const transactionRequest = useRef(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("finance.theme", dark ? "dark" : "light");
  }, [dark]);

  async function loadData(page = transactionsPage.page || 1): Promise<RefreshedData> {
    const generation = ++dashboardRequest.current;
    const transactionGeneration = ++transactionRequest.current;
    setRefreshing(true);
    const requestId = Date.now();
    try {
      const [dashboardResponse, categoriesResponse, transactionsResponse, billsResponse, goalsResponse, investmentsResponse, tagsResponse, preferenceResponse] = await Promise.allSettled([
        api.get("/dashboard", { params: { _t: requestId } }),
        api.get("/categories", { params: { _t: requestId } }),
        api.get("/transactions", { params: transactionParams(filters, page, requestId) }),
        api.get("/bills", { params: { _t: requestId } }),
        api.get("/goals", { params: { _t: requestId } }),
        api.get("/investments", { params: { _t: requestId } }),
        api.get("/tags", { params: { _t: requestId } }),
        api.get("/dashboard-preference", { params: { _t: requestId } })
      ]);

      const failedRequests = [dashboardResponse, categoriesResponse, transactionsResponse, billsResponse, goalsResponse, investmentsResponse, tagsResponse, preferenceResponse].filter((result) => result.status === "rejected");
      if (generation !== dashboardRequest.current) return { dashboard, transactions: transactionsPage };
      setLoadError(failedRequests.length ? "Alguns dados nao puderam ser atualizados. Os valores exibidos podem estar desatualizados." : null);

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
      if (tagsResponse.status === "fulfilled") setTags(tagsResponse.value.data);
      if (preferenceResponse.status === "fulfilled") setPreference(preferenceResponse.value.data);

      const nextTransactions = transactionsResponse.status === "fulfilled" ? transactionsResponse.value.data : transactionsPage;

      if (transactionsResponse.status === "fulfilled" && transactionGeneration === transactionRequest.current) {
        setTransactionsPage(nextTransactions);
      }

      return { dashboard: nextDashboard, transactions: nextTransactions };
    } finally {
      if (generation === dashboardRequest.current) {
        setLoading(false);
        setRefreshing(false);
      }
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
    const generation = ++transactionRequest.current;
    try {
      const response = await api.get("/transactions", { params: transactionParams(filters, page, Date.now()) });
      if (generation === transactionRequest.current) setTransactionsPage(response.data);
    } catch (error) {
      if (generation === transactionRequest.current) notify("error", getApiErrorMessage(error, "Nao foi possivel carregar as movimentacoes."));
    }
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

  const expenseCategories = useMemo(() => categories.filter((category) => category.type !== "INCOME" && !category.archived), [categories]);
  const incomeCategories = useMemo(() => categories.filter((category) => category.type !== "EXPENSE" && !category.archived), [categories]);

  useEffect(() => {
    transactionRequest.current += 1;
    if (loading) return;
    const timeout = window.setTimeout(() => void loadTransactions(1), 300);
    return () => window.clearTimeout(timeout);
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
        accountId: form.get("accountId") || undefined,
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
    return <div className="app-shell grid min-h-screen place-items-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">Carregando painel financeiro...</div>;
  }

  return (
    <main className="app-shell min-h-screen transition-colors">
      {toast && <ToastMessage toast={toast} />}
      <aside className="surface-nav fixed inset-y-0 left-0 z-20 hidden w-64 lg:block">
        <div className="sidebar-brand flex h-24 items-center gap-3 px-5">
          <span className="brand-mark grid h-11 w-11 place-items-center">
            <WalletCards size={22} />
          </span>
          <div>
            <p className="sidebar-brand-name font-semibold">finanças<span className="brand-dot">.</span></p>
            <p className="sidebar-brand-caption text-xs">Seu espaço financeiro</p>
          </div>
        </div>
        <p className="sidebar-label">WORKSPACE</p>
        <nav className="grid gap-1 px-3" aria-label="Navegação principal">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`nav-item flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                activeView === item.key
                  ? "nav-item-active"
                  : "nav-item-idle"
              }`}
              title={item.label}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="sidebar-foot-icon"><Sparkles size={17} /></span>
          <div><strong>Decida com clareza</strong><p>Seu futuro começa nos detalhes de hoje.</p></div>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="surface-header sticky top-0 z-10 px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="header-kicker">SEU CENTRO DE CONTROLE <span>/</span> Olá, {user?.name}</p>
              <h1 className="header-title text-2xl font-semibold">{viewTitles[activeView].title}<span className="brand-dot">.</span></h1>
              <p className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
                {viewTitles[activeView].subtitle}
                {refreshing && <span className="ml-2 text-blue-600 dark:text-blue-300">Atualizando...</span>}
              </p>
            </div>
            <div className="header-actions flex items-center gap-2">
              <span className="header-status"><span className="live-pulse" /> PAINEL ATIVO</span>
              <button onClick={exportPdf} className="header-icon-button grid h-10 w-10 place-items-center" title="Exportar PDF" aria-label="Exportar PDF">
                <Download size={18} />
              </button>
              <button onClick={() => setDark((value) => !value)} className="header-icon-button grid h-10 w-10 place-items-center" title="Alternar tema" aria-label="Alternar tema">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => setActiveView("profile")} className={`header-icon-button grid h-10 w-10 place-items-center transition ${
                activeView === "profile"
                  ? "header-icon-active"
                  : ""
              }`} title="Meu perfil">
                <UserRound size={18} />
              </button>
              <button onClick={() => void logout()} className="header-icon-button grid h-10 w-10 place-items-center" title="Sair" aria-label="Sair">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <div className="mobile-nav mt-4 flex gap-2 overflow-x-auto lg:hidden">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
                  activeView === item.key ? "mobile-nav-active" : "mobile-nav-idle"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="dashboard-content mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Suspense fallback={<p role="status">Carregando...</p>}>
            {activeView === "accounts" && <AccountsPage notify={notify} onRefresh={refreshAfterMutation} />}
            {activeView === "cards" && <CardsPage notify={notify} categories={categories} onRefresh={refreshAfterMutation} />}
            {activeView === "import" && <ImportPage notify={notify} categories={categories} onRefresh={refreshAfterMutation} />}
            {activeView === "reports" && <ReportsPage notify={notify} categories={categories} />}
            {activeView === "backup" && <BackupPage notify={notify} onRefresh={refreshAfterMutation} />}
            {activeView === "settings" && <SettingsPage notify={notify} categories={categories} tags={tags} onRefresh={refreshAfterMutation} />}
          </Suspense>
          {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"><span>{loadError}</span><button type="button" disabled={refreshing} onClick={() => void loadData()} className="font-semibold underline disabled:opacity-50">Tentar novamente</button></div>}
          {activeView === "overview" && <Overview dashboard={dashboard} preference={preference} onBillStatusChange={updateBillStatus} />}
          {activeView === "transactions" && (
            <TransactionsView
              categories={[...incomeCategories, ...expenseCategories]}
              tags={tags}
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
              onRefresh={refreshAfterMutation}
              notify={notify}
            />
          )}
          {activeView === "agenda" && <AgendaView bills={dashboard.bills} saving={saving} onSubmit={submitBill} onBillStatusChange={updateBillStatus} onRemove={(bill) => removeResource("bills", bill.id, "Conta removida da agenda.")} />}
          {activeView === "planning" && <PlanningView categories={expenseCategories} notify={notify} onRefresh={refreshAfterMutation} />}
          {activeView === "insights" && <InsightsView preference={preference} setPreference={setPreference} notify={notify} />}
          {activeView === "investments" && <InvestmentsView investments={dashboard.investmentsList} monthlySeries={dashboard.monthlySeries} saving={saving} onSubmit={submitInvestment} onUpdate={updateInvestment} onRemove={(investment) => removeResource("investments", investment.id, "Investimento removido.")} />}
          {activeView === "goals" && <GoalsView goals={dashboard.goals} saving={saving} onSubmit={submitGoal} onAddAmount={addGoalAmount} onRemove={(goal) => removeResource("goals", goal.id, "Meta removida.")} />}
          {activeView === "ai" && <AiAdviceView dashboard={dashboard} onRefresh={refreshAfterMutation} notify={notify} />}
          {activeView === "profile" && <ProfileView user={user} onUserUpdate={updateUser} notify={notify} />}
        </div>
      </section>
    </main>
  );
}

