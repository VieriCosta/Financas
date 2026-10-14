import { FormEvent, useEffect, useState } from "react";
import axios from "axios";

import { Trash2 } from "lucide-react";
import { api } from "../api/client";

import { Budget, Category, RecurringRule } from "../types/finance";
import { dateLabel, money } from "../utils/format";
import { RefreshedData } from "../types/dashboard";

import { PeriodPicker } from "./PeriodPicker";
import { Field, control, MutationForm } from "./FinanceForms";
import {
  Panel,
  SubmitButton,
  getApiErrorMessage,
  Input,
  Select,
} from "./FinanceUI";

export function PlanningView({
  categories,
  notify,
  onRefresh,
}: {
  categories: Category[];
  notify: (type: "success" | "error", message: string) => void;
  onRefresh: () => Promise<RefreshedData | null>;
}) {
  const now = new Date();
  const [period, setPeriod] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadPlanning() {
    const [budgetResponse, rulesResponse] = await Promise.all([
      api.get<Budget[]>("/budgets", { params: period }),
      api.get<RecurringRule[]>("/recurring-rules"),
    ]);
    setBudgets(budgetResponse.data);
    setRules(rulesResponse.data);
  }

  useEffect(() => {
    loadPlanning().catch(() =>
      notify("error", "Não foi possível carregar o planejamento."),
    );
  }, [period]);

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
        categoryId: form.get("categoryId") || undefined,
      });
      formElement.reset();
      await onRefresh();
      notify("success", "Compra parcelada distribuida nas movimentações.");
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(error, "Não foi possível criar as parcelas."),
      );
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
        month: period.month,
        year: period.year,
      });
      formElement.reset();
      await loadPlanning();
      notify("success", "Limite mensal salvo.");
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(error, "Não foi possível salvar o limite."),
      );
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
        transactionType:
          resource === "TRANSACTION" ? form.get("transactionType") : undefined,
        categoryId:
          resource === "TRANSACTION"
            ? form.get("categoryId") || undefined
            : undefined,
        frequency: form.get("frequency"),
        interval: Number(form.get("interval") || 1),
        nextRunAt: form.get("nextRunAt"),
      });
      formElement.reset();
      await loadPlanning();
      await onRefresh();
      notify("success", "Regra recorrente criada.");
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(error, "Não foi possível criar a recorrência."),
      );
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
      notify("error", "Não foi possível remover este item.");
    }
  }

  return (
    <div className="grid gap-5">
      <PeriodPicker
        {...period}
        onChange={(month, year) => setPeriod({ month, year })}
      />
      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Compra parcelada">
          <form onSubmit={submitInstallments} className="grid gap-3">
            <Input name="description" placeholder="Descrição da compra" />
            <Input
              name="totalAmount"
              type="number"
              step="0.01"
              placeholder="Valor total"
            />
            <Input
              name="installments"
              type="number"
              min="2"
              max="120"
              placeholder="Número de parcelas"
            />
            <Input name="firstDate" type="date" />
            <Select
              name="categoryId"
              options={[
                ["", "Categoria"],
                ...categories.map(
                  (item) => [item.id, item.name] as [string, string],
                ),
              ]}
            />
            <SubmitButton disabled={saving}>Distribuir parcelas</SubmitButton>
          </form>
        </Panel>

        <Panel title="Limite por categoria">
          <form onSubmit={submitBudget} className="grid gap-3">
            <Select
              name="categoryId"
              options={categories.map(
                (item) => [item.id, item.name] as [string, string],
              )}
            />
            <Input
              name="limitAmount"
              type="number"
              step="0.01"
              placeholder="Limite deste mês"
            />
            <SubmitButton disabled={saving}>Salvar limite</SubmitButton>
          </form>
        </Panel>

        <Panel title="Nova recorrência">
          <form onSubmit={submitRule} className="grid gap-3">
            <Select
              name="resource"
              options={[
                ["TRANSACTION", "Movimentação"],
                ["BILL", "Conta na agenda"],
              ]}
            />
            <Input name="title" placeholder="Descrição" />
            <Input
              name="amount"
              type="number"
              step="0.01"
              placeholder="Valor"
            />
            <Select
              name="transactionType"
              options={[
                ["EXPENSE", "Despesa"],
                ["INCOME", "Receita"],
              ]}
            />
            <Select
              name="categoryId"
              options={[
                ["", "Categoria opcional"],
                ...categories.map(
                  (item) => [item.id, item.name] as [string, string],
                ),
              ]}
            />
            <Select
              name="frequency"
              options={[
                ["WEEKLY", "Semanal"],
                ["MONTHLY", "Mensal"],
                ["YEARLY", "Anual"],
              ]}
            />
            <Input
              name="interval"
              type="number"
              min="1"
              defaultValue="1"
              placeholder="Intervalo"
            />
            <Input name="nextRunAt" type="date" />
            <SubmitButton disabled={saving}>Criar recorrência</SubmitButton>
          </form>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Orçamentos do mês">
          {budgets.length === 0 && (
            <p className="text-sm text-slate-500">
              Nenhum limite cadastrado neste mês.
            </p>
          )}
          {budgets.map((budget) => (
            <article
              key={budget.id}
              className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <strong>{budget.category.name}</strong>
                <button
                  onClick={() => void remove("budgets", budget.id)}
                  className="text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {money(budget.spent)} de {money(Number(budget.limitAmount))}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full ${budget.percentage > 100 ? "bg-red-500" : "bg-blue-600"}`}
                  style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                />
              </div>
            </article>
          ))}
        </Panel>
        <Panel title="Regras recorrentes">
          {editingRule && (
            <div className="mb-4 rounded-lg border p-4">
              <MutationForm
                endpoint={`/recurring-rules/${editingRule.id}`}
                method="patch"
                notify={notify}
                onSaved={async () => {
                  setEditingRule(null);
                  await loadPlanning();
                  await onRefresh();
                }}
              >
                <Field label="Descrição">
                  <input
                    className={control}
                    name="title"
                    defaultValue={editingRule.title}
                    required
                    minLength={2}
                    maxLength={160}
                  />
                </Field>
                <Field label="Valor">
                  <input
                    className={control}
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={editingRule.amount}
                    required
                  />
                </Field>
                <Field label="Frequência">
                  <select
                    className={control}
                    name="frequency"
                    defaultValue={editingRule.frequency}
                  >
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </Field>
                <Field label="Intervalo">
                  <input
                    className={control}
                    name="interval"
                    type="number"
                    min="1"
                    max="120"
                    defaultValue={editingRule.interval}
                    required
                  />
                </Field>
                <Field label="Próxima execução">
                  <input
                    className={control}
                    name="nextRunAt"
                    type="date"
                    defaultValue={editingRule.nextRunAt.slice(0, 10)}
                    required
                  />
                </Field>
              </MutationForm>
              <button
                className="mt-3 text-sm underline"
                onClick={() => setEditingRule(null)}
              >
                Cancelar
              </button>
            </div>
          )}
          {rules.length === 0 && (
            <p className="text-sm text-slate-500">
              Nenhuma regra recorrente cadastrada.
            </p>
          )}
          {rules.map((rule) => (
            <article
              key={rule.id}
              className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <div>
                <strong>{rule.title}</strong>
                <p className="mt-1 text-slate-500">
                  {money(Number(rule.amount))} · {rule.frequency.toLowerCase()}{" "}
                  · próxima: {dateLabel(rule.nextRunAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="underline"
                  onClick={() => setEditingRule(rule)}
                >
                  Editar
                </button>
                <button
                  className="underline"
                  onClick={() => {
                    void api
                      .patch(`/recurring-rules/${rule.id}`, {
                        active: !rule.active,
                      })
                      .then(loadPlanning)
                      .catch(() =>
                        notify("error", "Não foi possível alterar a regra."),
                      );
                  }}
                >
                  {rule.active ? "Pausar" : "Reativar"}
                </button>
                <button
                  aria-label={`Excluir regra ${rule.title}`}
                  onClick={() => void remove("recurring-rules", rule.id)}
                  className="text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </Panel>
      </section>
    </div>
  );
}
