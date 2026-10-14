import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import {
  Category,
  Tag,
  DashboardData,
  DashboardPreference,
  PaginatedTransactions,
} from "../types/finance";
import { RefreshedData } from "../types/dashboard";
import { Notify } from "../components/FinanceForms";
import { transactionParams, getApiErrorMessage } from "../components/FinanceUI";
const emptyDashboard: DashboardData = {
  cards: {
    balance: 0,
    monthIncome: 0,
    monthExpense: 0,
    investments: 0,
    projectedBalance: 0,
  },
  projection: {
    currentBalance: 0,
    projectedBalance: 0,
    scheduledBalance: 0,
    pendingBillTotal: 0,
    periodDays: 30,
  },
  monthlySeries: [],
  categorySummary: [],
  goals: [],
  bills: [],
  investmentsList: [],
  recentTransactions: [],
};
const emptyTransactions: PaginatedTransactions = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};
export function useFinanceData(saving: boolean, notify: Notify) {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [preference, setPreference] = useState<DashboardPreference>({
    hiddenWidgets: [],
    widgetOrder: ["metrics", "charts", "alerts", "bills", "goals"],
    chartMonths: 6,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    type: "",
    search: "",
    categoryId: "",
    tagId: "",
    minAmount: "",
    maxAmount: "",
    accountId: "",
    reconciled: "",
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(emptyTransactions);
  const [refreshing, setRefreshing] = useState(false);
  const dashboardRequest = useRef(0);
  const transactionRequest = useRef(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  useEffect(
    () => () => {
      dashboardRequest.current += 1;
      transactionRequest.current += 1;
    },
    [],
  );
  async function loadData(
    page = transactionsPage.page || 1,
  ): Promise<RefreshedData> {
    const generation = ++dashboardRequest.current;
    const transactionGeneration = ++transactionRequest.current;
    setRefreshing(true);
    const requestId = Date.now();
    try {
      const [
        dashboardResponse,
        categoriesResponse,
        transactionsResponse,
        billsResponse,
        goalsResponse,
        investmentsResponse,
        tagsResponse,
        preferenceResponse,
      ] = await Promise.allSettled([
        api.get("/dashboard", { params: { _t: requestId } }),
        api.get("/categories", { params: { _t: requestId } }),
        api.get("/transactions", {
          params: transactionParams(filters, page, requestId),
        }),
        api.get("/bills", { params: { _t: requestId } }),
        api.get("/goals", { params: { _t: requestId } }),
        api.get("/investments", { params: { _t: requestId } }),
        api.get("/tags", { params: { _t: requestId } }),
        api.get("/dashboard-preference", { params: { _t: requestId } }),
      ]);

      const failedRequests = [
        dashboardResponse,
        categoriesResponse,
        transactionsResponse,
        billsResponse,
        goalsResponse,
        investmentsResponse,
        tagsResponse,
        preferenceResponse,
      ].filter((result) => result.status === "rejected");
      if (generation !== dashboardRequest.current)
        return { dashboard, transactions: transactionsPage };
      setLoadError(
        failedRequests.length
          ? "Alguns dados não puderam ser atualizados. Os valores exibidos podem estar desatualizados."
          : null,
      );

      const nextDashboard: DashboardData = {
        ...(dashboardResponse.status === "fulfilled"
          ? dashboardResponse.value.data
          : dashboard),
        bills:
          billsResponse.status === "fulfilled"
            ? billsResponse.value.data
            : dashboard.bills,
        goals:
          goalsResponse.status === "fulfilled"
            ? goalsResponse.value.data
            : dashboard.goals,
        investmentsList:
          investmentsResponse.status === "fulfilled"
            ? investmentsResponse.value.data
            : dashboard.investmentsList,
      };

      setDashboard(nextDashboard);

      if (categoriesResponse.status === "fulfilled") {
        setCategories(categoriesResponse.value.data);
      }
      if (tagsResponse.status === "fulfilled") setTags(tagsResponse.value.data);
      if (preferenceResponse.status === "fulfilled")
        setPreference(preferenceResponse.value.data);

      const nextTransactions =
        transactionsResponse.status === "fulfilled"
          ? transactionsResponse.value.data
          : transactionsPage;

      if (
        transactionsResponse.status === "fulfilled" &&
        transactionGeneration === transactionRequest.current &&
        JSON.stringify(filters) === JSON.stringify(filtersRef.current)
      ) {
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
      // A gravacao já terminou; falha de refresh não deve virar erro de salvamento.
      return null;
    }
  }
  async function loadTransactions(page = transactionsPage.page) {
    const generation = ++transactionRequest.current;
    try {
      const response = await api.get("/transactions", {
        params: transactionParams(filters, page, Date.now()),
      });
      if (
        generation === transactionRequest.current &&
        JSON.stringify(filters) === JSON.stringify(filtersRef.current)
      )
        setTransactionsPage(response.data);
    } catch (error) {
      if (generation === transactionRequest.current)
        notify(
          "error",
          getApiErrorMessage(
            error,
            "Não foi possível carregar as movimentações.",
          ),
        );
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
  useEffect(() => {
    if (loading) return;
    transactionRequest.current += 1;
    const timeout = window.setTimeout(() => void loadTransactions(1), 300);
    return () => window.clearTimeout(timeout);
  }, [filters]);
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!saving && !refreshing && document.visibilityState === "visible") {
        loadData(transactionsPage.page || 1);
      }
    }, 60000);

    return () => window.clearInterval(interval);
  }, [filters, refreshing, saving, transactionsPage.page]);
  return {
    dashboard,
    categories,
    tags,
    preference,
    setPreference,
    loading,
    filters,
    setFilters,
    loadError,
    transactionsPage,
    refreshing,
    loadData,
    refreshAfterMutation,
    loadTransactions,
  };
}
