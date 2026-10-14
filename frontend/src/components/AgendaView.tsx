import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Account } from "../pages/AccountsPage";
import axios from "axios";

import { CalendarClock, CheckCircle2, ReceiptText } from "lucide-react";

import { Bill } from "../types/finance";
import { dateLabel, money } from "../utils/format";

import {
  Metric,
  Panel,
  IconButton,
  SubmitButton,
  Input,
  Select,
} from "./FinanceUI";

export function AgendaView({
  bills,
  saving,
  onSubmit,
  onBillStatusChange,
  onRemove,
}: {
  bills: Bill[];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onBillStatusChange: (bill: Bill) => Promise<void>;
  onRemove: (bill: Bill) => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsError, setAccountsError] = useState(false);
  useEffect(() => {
    void api
      .get<Account[]>("/accounts")
      .then((response) =>
        setAccounts(response.data.filter((item) => !item.archived)),
      )
      .catch(() => setAccountsError(true));
  }, []);
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
          <Select
            name="accountId"
            options={[
              ["", "Sem conta vinculada"],
              ...accounts.map(
                (item) => [item.id, item.name] as [string, string],
              ),
            ]}
          />
          {accountsError && (
            <p role="alert" className="text-sm text-amber-600">
              Não foi possível carregar as contas.
            </p>
          )}
          <Select
            name="status"
            options={[
              ["PENDING", "Pendente"],
              ["PAID", "Paga"],
            ]}
          />
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium dark:border-slate-800 dark:bg-slate-950">
            <input
              name="isRecurring"
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
            />
            Repetir todo mês nesta data
          </label>
          <SubmitButton disabled={saving}>Salvar na agenda</SubmitButton>
        </form>
      </Panel>

      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-3">
          <Metric
            title="Pendentes"
            value={String(pending.length)}
            icon={<CalendarClock />}
            tone="red"
          />
          <Metric
            title="Pagas"
            value={String(paid.length)}
            icon={<CheckCircle2 />}
            tone="green"
          />
          <Metric
            title="Todo mês"
            value={String(recurring.length)}
            icon={<ReceiptText />}
            tone="blue"
          />
        </section>

        <Panel title="Contas da agenda">
          <div className="space-y-3">
            {bills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                onStatusChange={onBillStatusChange}
                onRemove={onRemove}
              />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function BillRow({
  bill,
  onStatusChange,
  onRemove,
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
          {bill.isRecurring && (
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              Todo mês
            </span>
          )}
          <span
            className={
              bill.status === "PAID"
                ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300"
            }
          >
            {bill.status === "PAID" ? "Paga" : "Pendente"}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {dateLabel(bill.dueDate)}
          {bill.isRecurring && bill.recurrenceDay
            ? ` - repete dia ${bill.recurrenceDay}`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <span className="font-semibold">{money(bill.amount)}</span>
        {onStatusChange && (
          <button
            onClick={() => onStatusChange(bill)}
            className={
              bill.status === "PAID"
                ? "h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                : "h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            }
          >
            {bill.status === "PAID" ? "Marcar pendente" : "Marcar paga"}
          </button>
        )}
        {onRemove && (
          <IconButton label="Remover conta" onClick={() => onRemove(bill)} />
        )}
      </div>
    </div>
  );
}
