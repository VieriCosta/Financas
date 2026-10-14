import { FormEvent } from "react";
import axios from "axios";

import { PiggyBank, Target, TrendingUp } from "lucide-react";

import { Goal } from "../types/finance";
import { money } from "../utils/format";

import {
  Metric,
  Panel,
  IconButton,
  EmptyState,
  SubmitButton,
  Input,
} from "./FinanceUI";

export function GoalsView({
  goals,
  saving,
  onSubmit,
  onAddAmount,
  onRemove,
}: {
  goals: Goal[];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAddAmount: (goalId: string, amount: number) => Promise<void>;
  onRemove: (goal: Goal) => void;
}) {
  const targetTotal = goals.reduce(
    (sum, goal) => sum + Number(goal.targetAmount),
    0,
  );
  const currentTotal = goals.reduce(
    (sum, goal) => sum + Number(goal.currentAmount),
    0,
  );
  const percent = targetTotal
    ? Math.round((currentTotal / targetTotal) * 100)
    : 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Nova meta financeira">
        <form onSubmit={onSubmit} className="grid gap-3">
          <Input name="title" placeholder="Nome da meta" />
          <Input
            name="targetAmount"
            placeholder="Objetivo"
            type="number"
            step="0.01"
          />
          <Input
            name="currentAmount"
            placeholder="Valor atual"
            type="number"
            step="0.01"
          />
          <Input name="deadline" type="date" />
          <SubmitButton disabled={saving}>Criar meta</SubmitButton>
        </form>
      </Panel>

      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-3">
          <Metric
            title="Objetivo total"
            value={money(targetTotal)}
            icon={<Target />}
            tone="blue"
          />
          <Metric
            title="Ja reservado"
            value={money(currentTotal)}
            icon={<PiggyBank />}
            tone="green"
          />
          <Metric
            title="Progresso"
            value={`${percent}%`}
            icon={<TrendingUp />}
            tone="slate"
          />
        </section>
        <Panel title="Todas as metas">
          <GoalList
            goals={goals}
            onAddAmount={onAddAmount}
            onRemove={onRemove}
          />
        </Panel>
      </div>
    </div>
  );
}

export function GoalList({
  goals,
  onAddAmount,
  onRemove,
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
        const percent = Math.min(
          100,
          (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100,
        );
        return (
          <div
            key={goal.id}
            className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-transparent"
          >
            <div className="mb-2 flex justify-between gap-4 text-sm">
              <span className="font-medium">{goal.title}</span>
              <div className="flex items-center gap-2">
                <span>{Math.round(percent)}%</span>
                {onRemove && (
                  <IconButton
                    label="Remover meta"
                    onClick={() => onRemove(goal)}
                  />
                )}
              </div>
            </div>
            <div className="mb-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${percent}%` }}
              />
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
                <button className="h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                  Adicionar
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
