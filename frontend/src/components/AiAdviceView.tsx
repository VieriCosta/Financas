import { FormEvent, useEffect, useState } from "react";
import axios from "axios";

import {
  Bot,
  PiggyBank,
  ReceiptText,
  Send,
  Target,
  WandSparkles,
} from "lucide-react";
import { api } from "../api/client";

import { DashboardData } from "../types/finance";
import { money } from "../utils/format";
import { RefreshedData } from "../types/dashboard";

import {
  AiCommandPreview,
  AiHistoryItem,
  Metric,
  Panel,
  getApiErrorMessage,
  buildFinancialAdvice,
} from "./FinanceUI";

export function AiAdviceView({
  dashboard,
  onRefresh,
  notify,
}: {
  dashboard: DashboardData;
  onRefresh: () => Promise<RefreshedData | null>;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const advice = buildFinancialAdvice(dashboard);
  const expenseRatio =
    dashboard.cards.monthIncome > 0
      ? Math.round(
          (dashboard.cards.monthExpense / dashboard.cards.monthIncome) * 100,
        )
      : 0;
  const goalProgress = dashboard.goals.reduce(
    (sum, goal) => sum + Number(goal.currentAmount),
    0,
  );
  const goalTarget = dashboard.goals.reduce(
    (sum, goal) => sum + Number(goal.targetAmount),
    0,
  );
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
      const { data } = await api.post("/ai/advice", {
        message: form.get("message"),
      });
      setAdviceAnswer(data.message);
      await loadHistory();
      formElement.reset();
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(error, "Não foi possível consultar a IA agora."),
      );
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
      const { data } = await api.post<AiCommandPreview>(
        "/ai/commands/preview",
        { message: form.get("message") },
      );
      setPreview(data);
      formElement.reset();
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(
          error,
          "Não foi possível interpretar o pedido agora.",
        ),
      );
    } finally {
      setLoadingAi(false);
    }
  }

  async function confirmCommand() {
    if (!preview?.confirmationToken) return;

    try {
      setLoadingAi(true);
      await api.post("/ai/commands/confirm", {
        confirmationToken: preview.confirmationToken,
      });
      await onRefresh();
      await loadHistory();
      setPreview(null);
      notify("success", "Operacoes confirmadas e salvas pela assistente.");
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(error, "Não foi possível confirmar este cadastro."),
      );
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
      notify(
        "error",
        getApiErrorMessage(error, "Não foi possível gerar o relatório mensal."),
      );
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric
          title="Gastos / receita"
          value={`${expenseRatio}%`}
          icon={<ReceiptText />}
          tone={expenseRatio > 80 ? "red" : "blue"}
        />
        <Metric
          title="Metas guardadas"
          value={money(goalProgress)}
          icon={<Target />}
          tone="green"
        />
        <Metric
          title="Falta para metas"
          value={money(Math.max(goalTarget - goalProgress, 0))}
          icon={<PiggyBank />}
          tone="slate"
        />
      </section>

      <Panel title="Assistente financeiro">
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("advice")}
            className={
              mode === "advice"
                ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            }
          >
            <Bot className="mr-2 inline" size={17} /> Pedir conselho
          </button>
          <button
            type="button"
            onClick={() => setMode("command")}
            className={
              mode === "command"
                ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            }
          >
            <WandSparkles className="mr-2 inline" size={17} /> Comandos rapidos
          </button>
          <button
            type="button"
            disabled={loadingAi}
            onClick={createReport}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <ReceiptText className="mr-2 inline" size={17} /> Relatório mensal
          </button>
        </div>

        {mode === "advice" ? (
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Converse sobre seus dados financeiros atuais. Exemplo: “onde estou
              gastando demais?” ou “como posso acelerar minha reserva?”.
            </p>
            <AiMessageForm
              disabled={loadingAi}
              placeholder="Pergunte algo sobre suas finanças..."
              onSubmit={submitAdvice}
            />
            {adviceAnswer && <AiAnswer text={adviceAnswer} />}
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Descreva um ou varios cadastros. A assistente tambem pode propor
              edicoes e exclusoes, sempre com sua confirmação.
            </p>
            <AiMessageForm
              disabled={loadingAi}
              placeholder='Ex.: "gastei 85 no mercado e 40 na farmacia hoje"'
              onSubmit={submitCommand}
            />
            {preview && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                <p className="font-semibold text-blue-950 dark:text-blue-100">
                  {preview.ready
                    ? "Confira antes de salvar"
                    : "Preciso de mais uma informacao"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {preview.clarification ?? preview.summary}
                </p>
                {preview.ready && preview.actions.length > 0 && (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3 text-sm text-slate-700 dark:border-blue-500/20 dark:bg-slate-950 dark:text-slate-200">
                    <p className="font-semibold">
                      {preview.actions.length} operacao(oes) proposta(s)
                    </p>
                    <p className="mt-1 leading-6">{preview.summary}</p>
                  </div>
                )}
                {preview.confirmationToken && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loadingAi}
                      onClick={confirmCommand}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      Confirmar cadastro
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreview(null)}
                      className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 dark:border-blue-500/30 dark:bg-slate-950 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Histórico da assistente">
        {history.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhuma interacao registrada ainda.
          </p>
        )}
        {history.slice(0, 8).map((item) => (
          <article
            key={item.id}
            className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              {item.kind} · {item.status}
            </p>
            <p className="mt-1 text-sm font-semibold">{item.request}</p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-500">
              {item.response}
            </p>
          </article>
        ))}
      </Panel>

      <Panel title="Recomendacoes automaticas">
        <div className="grid gap-3">
          {advice.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-transparent"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={
                    item.tone === "danger"
                      ? "h-2.5 w-2.5 rounded-full bg-red-500"
                      : item.tone === "success"
                        ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
                        : "h-2.5 w-2.5 rounded-full bg-blue-500"
                  }
                />
                <h2 className="font-semibold">{item.title}</h2>
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function AiMessageForm({
  disabled,
  placeholder,
  onSubmit,
}: {
  disabled: boolean;
  placeholder: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        name="message"
        required
        maxLength={1000}
        placeholder={placeholder}
        className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
      />
      <button
        disabled={disabled}
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        <Send size={17} /> {disabled ? "Consultando..." : "Enviar"}
      </button>
    </form>
  );
}

export function AiAnswer({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Bot size={18} className="text-blue-600 dark:text-blue-300" />{" "}
        Assistente
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
        {text}
      </p>
    </div>
  );
}
