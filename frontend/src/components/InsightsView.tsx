import { useEffect, useState } from "react";
import axios from "axios";

import { Bell, PiggyBank, ShieldCheck, Target } from "lucide-react";
import { api } from "../api/client";

import {
  DashboardPreference,
  EmergencyReserve,
  InternalAlert,
  MonthlyClosing,
} from "../types/finance";
import { dateLabel, money } from "../utils/format";

import { PeriodPicker } from "./PeriodPicker";

import { Metric, Panel, Select } from "./FinanceUI";

export function InsightsView({
  preference,
  setPreference,
  notify,
}: {
  preference: DashboardPreference;
  setPreference: (preference: DashboardPreference) => void;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const now = new Date();
  const [period, setPeriod] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [closing, setClosing] = useState<MonthlyClosing | null>(null);
  const [alerts, setAlerts] = useState<InternalAlert[]>([]);
  const [reserve, setReserve] = useState<EmergencyReserve | null>(null);
  const [logs, setLogs] = useState<
    Array<{ id: string; action: string; resource: string; createdAt: string }>
  >([]);
  const [sessions, setSessions] = useState<
    Array<{
      id: string;
      userAgent?: string;
      ipAddress?: string;
      lastSeenAt: string;
      current: boolean;
    }>
  >([]);

  async function loadInsights() {
    const [
      closingResponse,
      alertsResponse,
      reserveResponse,
      logsResponse,
      sessionsResponse,
    ] = await Promise.all([
      api.get("/monthly-closing", { params: period }),
      api.get("/alerts"),
      api.get("/emergency-reserve"),
      api.get("/audit-logs"),
      api.get("/profile/sessions"),
    ]);
    setClosing(closingResponse.data);
    setAlerts(alertsResponse.data);
    setReserve(reserveResponse.data);
    setLogs(logsResponse.data);
    setSessions(sessionsResponse.data);
  }

  useEffect(() => {
    loadInsights().catch(() =>
      notify("error", "Não foi possível carregar os insights."),
    );
  }, [period]);

  async function closeMonth() {
    await api.post("/monthly-closing", period);
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
    notify("success", "Outras sessões encerradas.");
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric
          title="Reserva de emergência"
          value={money(reserve?.reserve ?? 0)}
          icon={<ShieldCheck />}
          tone="green"
        />
        <Metric
          title="Meses cobertos"
          value={`${(reserve?.coveredMonths ?? 0).toFixed(1)} meses`}
          icon={<PiggyBank />}
          tone={(reserve?.coveredMonths ?? 0) >= 6 ? "green" : "red"}
        />
        <Metric
          title="Meta recomendada"
          value={money(reserve?.recommendedReserve ?? 0)}
          icon={<Target />}
          tone="blue"
        />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Fechamento mensal">
          <PeriodPicker
            {...period}
            onChange={(month, year) => setPeriod({ month, year })}
          />
          <p className="text-sm text-slate-500">
            Compare o realizado com seus limites e registre uma fotografia deste
            mês.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p>
              Receitas
              <br />
              <strong>{money(closing?.income ?? 0)}</strong>
            </p>
            <p>
              Despesas
              <br />
              <strong>{money(closing?.expense ?? 0)}</strong>
            </p>
            <p>
              Orçamento
              <br />
              <strong>{money(closing?.budgetTotal ?? 0)}</strong>
            </p>
            <p>
              Resultado
              <br />
              <strong>{money(closing?.balance ?? 0)}</strong>
            </p>
          </div>
          <button
            onClick={() =>
              void closeMonth().catch(() =>
                notify("error", "Não foi possível fechar o mês."),
              )
            }
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {closing?.saved ? "Atualizar fechamento" : "Fechar mês"}
          </button>
        </Panel>
        <Panel title="Alertas internos">
          {alerts.length === 0 && (
            <p className="text-sm text-slate-500">Tudo tranquilo por aqui.</p>
          )}
          {alerts.map((item, index) => (
            <article
              key={`${item.type}-${index}`}
              className="mb-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <strong
                className={
                  item.tone === "danger" ? "text-red-600" : "text-amber-600"
                }
              >
                <Bell className="mr-2 inline" size={15} />
                {item.title}
              </strong>
              <p className="mt-1 text-slate-500">{item.message}</p>
            </article>
          ))}
        </Panel>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Personalizar dashboard">
          <p className="mb-3 text-sm text-slate-500">
            Escolha os blocos visiveis e o período dos graficos.
          </p>
          {["metrics", "charts", "bills", "goals"].map((widget) => (
            <label
              key={widget}
              className="mb-2 flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={!preference.hiddenWidgets.includes(widget)}
                onChange={() =>
                  void savePreference({
                    ...preference,
                    hiddenWidgets: preference.hiddenWidgets.includes(widget)
                      ? preference.hiddenWidgets.filter(
                          (item) => item !== widget,
                        )
                      : [...preference.hiddenWidgets, widget],
                  })
                }
              />{" "}
              Mostrar {widget}
            </label>
          ))}
          <div className="my-3 grid gap-2">
            {preference.widgetOrder
              .filter((widget) =>
                ["metrics", "charts", "bills", "goals"].includes(widget),
              )
              .map((widget) => (
                <div
                  key={widget}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <span>{widget}</span>
                  <span>
                    <button
                      onClick={() => moveWidget(widget, -1)}
                      className="px-2"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveWidget(widget, 1)}
                      className="px-2"
                    >
                      ↓
                    </button>
                  </span>
                </div>
              ))}
          </div>
          <Select
            name="chartMonths"
            value={String(preference.chartMonths)}
            onChange={(value) =>
              void savePreference({ ...preference, chartMonths: Number(value) })
            }
            options={[
              ["3", "Ultimos 3 meses"],
              ["6", "Ultimos 6 meses"],
              ["12", "Ultimos 12 meses"],
            ]}
          />
        </Panel>
        <Panel title="Sessões ativas">
          <button
            onClick={() =>
              void revokeOtherSessions().catch(() =>
                notify("error", "Não foi possível encerrar as sessões."),
              )
            }
            className="mb-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"
          >
            Encerrar outras sessões
          </button>
          {sessions.map((session) => (
            <article
              key={session.id}
              className="mb-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <strong>
                {session.current ? "Sessão atual" : "Outro dispositivo"}
              </strong>
              <p className="mt-1 text-slate-500">
                {session.userAgent ?? "Dispositivo não identificado"} ·{" "}
                {session.ipAddress ?? "IP indisponivel"}
              </p>
            </article>
          ))}
        </Panel>
      </section>
      <Panel title="Auditoria recente">
        {logs.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhuma alteracao registrada ainda.
          </p>
        )}
        {logs.slice(0, 12).map((log) => (
          <p
            key={log.id}
            className="border-b border-slate-100 py-2 text-sm dark:border-slate-800"
          >
            <strong>{log.action}</strong> · {log.resource}
            <span className="float-right text-slate-500">
              {dateLabel(log.createdAt)}
            </span>
          </p>
        ))}
      </Panel>
    </div>
  );
}
