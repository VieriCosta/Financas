import axios from "axios";
import {
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  PiggyBank,
  WalletCards,
} from "lucide-react";

import { Bill, DashboardData, DashboardPreference } from "../types/finance";
import { money } from "../utils/format";

import { BillRow } from "./AgendaView";
import { GoalList } from "./GoalsView";
import { Metric, Panel } from "./FinanceUI";

export function Overview({
  dashboard,
  preference,
  onBillStatusChange,
}: {
  dashboard: DashboardData;
  preference: DashboardPreference;
  onBillStatusChange: (bill: Bill) => Promise<void>;
}) {
  const hidden = new Set(preference.hiddenWidgets);
  const order = (widget: string) =>
    preference.widgetOrder.indexOf(widget) === -1
      ? 99
      : preference.widgetOrder.indexOf(widget);
  const monthResult =
    dashboard.cards.monthIncome - dashboard.cards.monthExpense;
  const spendingRatio =
    dashboard.cards.monthIncome > 0
      ? Math.round(
          (dashboard.cards.monthExpense / dashboard.cards.monthIncome) * 100,
        )
      : 0;

  return (
    <div className="grid gap-5">
      {!hidden.has("metrics") && (
        <section className="overview-hero surface-card animate-rise grid gap-6 rounded-xl p-6 xl:grid-cols-[1fr_0.72fr]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="hero-kicker">
                <span className="live-pulse" /> VISÃO GERAL{" "}
                <span className="hero-kicker-divider">/</span> SALDO DISPONÍVEL
              </p>
              <div className="capital-flow" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
            <strong className="hero-balance mt-3 block text-4xl font-semibold sm:text-5xl">
              {money(dashboard.cards.balance)}
            </strong>
            <p className="hero-description">
              Seu dinheiro em perspectiva. Acompanhe hoje, planeje o amanhã.
            </p>
            <div
              className="mt-6 h-32"
              role="img"
              aria-label="Receitas e despesas reais nos últimos meses"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.monthlySeries}>
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Area
                    dataKey="receitas"
                    name="Receitas"
                    stroke="#22d3ee"
                    fill="#22d3ee22"
                  />
                  <Area
                    dataKey="despesas"
                    name="Despesas"
                    stroke="#a78bfa"
                    fill="#a78bfa22"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <span
                className={
                  monthResult >= 0
                    ? "finance-pill rounded-full border px-3 py-1 font-medium"
                    : "rounded-full border border-red-200 px-3 py-1 font-medium text-red-700 dark:border-red-500/30 dark:text-red-300"
                }
              >
                {monthResult >= 0 ? "+" : "-"} {money(Math.abs(monthResult))} no
                mês
              </span>
              <span className="finance-pill-muted rounded-full border px-3 py-1 font-medium">
                {spendingRatio}% da receita usada
              </span>
            </div>
          </div>
          <div className="grid content-stretch gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MiniStat
              label="Receitas"
              value={money(dashboard.cards.monthIncome)}
              tone="income"
            />
            <MiniStat
              label="Despesas"
              value={money(dashboard.cards.monthExpense)}
              tone="expense"
            />
            <MiniStat
              label="Investido"
              value={money(dashboard.cards.investments)}
              tone="wealth"
            />
          </div>
        </section>
      )}

      {!hidden.has("metrics") && (
        <section
          style={{ order: order("metrics") }}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
        >
          <Metric
            title="Saldo dispon?vel"
            value={money(dashboard.cards.balance)}
            icon={<WalletCards />}
            tone="blue"
          />
          <Metric
            title="Receitas do mês"
            value={money(dashboard.cards.monthIncome)}
            icon={<ArrowUpCircle />}
            tone="green"
          />
          <Metric
            title="Despesas do mês"
            value={money(dashboard.cards.monthExpense)}
            icon={<ArrowDownCircle />}
            tone="red"
          />
          <Metric
            title="Investimentos"
            value={money(dashboard.cards.investments)}
            icon={<PiggyBank />}
            tone="slate"
          />
          <Metric
            title="Saldo em 30 dias"
            value={money(dashboard.cards.projectedBalance)}
            icon={<CalendarClock />}
            tone={dashboard.cards.projectedBalance < 0 ? "red" : "blue"}
          />
        </section>
      )}

      {!hidden.has("charts") && (
        <section
          style={{ order: order("charts") }}
          className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]"
        >
          <Panel title="Fluxo financeiro">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dashboard.monthlySeries.slice(-preference.chartMonths)}
                >
                  <defs>
                    <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#22d3ee"
                        stopOpacity={0.26}
                      />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263449" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stroke="#22d3ee"
                    fill="url(#income)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    stroke="#a78bfa"
                    fill="#a78bfa22"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Gastos por categoria">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboard.categorySummary}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {dashboard.categorySummary.map((entry) => (
                      <Cell key={entry.name} fill={entry.color ?? "#22d3ee"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>
      )}

      {(!hidden.has("bills") || !hidden.has("goals")) && (
        <section
          style={{ order: Math.min(order("bills"), order("goals")) }}
          className="grid gap-5 xl:grid-cols-2"
        >
          {!hidden.has("bills") && (
            <Panel title="Proximas contas">
              {dashboard.bills.slice(0, 5).map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  onStatusChange={onBillStatusChange}
                />
              ))}
            </Panel>
          )}
          {!hidden.has("goals") && (
            <Panel title="Metas em progresso">
              <GoalList goals={dashboard.goals.slice(0, 4)} />
            </Panel>
          )}
        </section>
      )}
    </div>
  );
}

export function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "wealth";
}) {
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
