import { useEffect, useState } from "react";
import { api } from "../api/client";
import { money, dateLabel } from "../utils/format";
import {
  control,
  Field,
  LocalDateInput,
  MutationForm,
  Notify,
  panel,
} from "../components/FinanceForms";

export type Account = {
  id: string;
  name: string;
  institution?: string;
  openingBalance: string | number;
  balance: number;
  archived: boolean;
};
type Transfer = {
  id: string;
  amount: number;
  date: string;
  fromAccount: Account;
  toAccount: Account;
};
export default function AccountsPage({
  notify,
  onRefresh,
}: {
  notify: Notify;
  onRefresh: () => Promise<unknown>;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [editing, setEditing] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  async function load() {
    const [a, t] = await Promise.all([
      api.get<Account[]>("/accounts"),
      api.get<Transfer[]>("/transfers"),
    ]);
    setAccounts(a.data);
    setTransfers(t.data);
    setReady(true);
  }
  useEffect(() => {
    void load().catch(() =>
      notify("error", "Não foi possível carregar as contas."),
    );
  }, []);
  async function saved() {
    setEditing(null);
    await load();
    await onRefresh();
  }
  async function archive(account: Account) {
    try {
      setBusy(true);
      await api.patch(`/accounts/${account.id}`, {
        archived: !account.archived,
      });
      await saved();
    } catch {
      notify("error", "Não foi possível alterar a conta.");
    } finally {
      setBusy(false);
    }
  }
  async function removeTransfer(id: string) {
    if (!window.confirm("Excluir esta transferencia e recalcular os saldos?"))
      return;
    try {
      setBusy(true);
      await api.delete(`/transfers/${id}`);
      await saved();
    } catch {
      notify("error", "Não foi possível excluir a transferencia.");
    } finally {
      setBusy(false);
    }
  }
  const active = accounts.filter((item) => !item.archived);
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? "Editar conta" : "Nova conta ou carteira"}
          </h2>
          <MutationForm
            key={editing?.id ?? "new"}
            endpoint={editing ? `/accounts/${editing.id}` : "/accounts"}
            method={editing ? "patch" : "post"}
            notify={notify}
            onSaved={saved}
          >
            <Field label="Nome">
              <input
                className={control}
                name="name"
                defaultValue={editing?.name}
                minLength={2}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Instituição">
              <input
                className={control}
                name="institution"
                defaultValue={editing?.institution}
                maxLength={120}
              />
            </Field>
            <Field label="Saldo inicial (antes dos lançamentos)">
              <input
                className={control}
                name="openingBalance"
                type="number"
                step="0.01"
                defaultValue={editing?.openingBalance ?? 0}
                required
              />
            </Field>
          </MutationForm>
          {editing && (
            <button
              className="mt-3 text-sm underline"
              onClick={() => setEditing(null)}
            >
              Cancelar edição
            </button>
          )}
        </section>
        <section className={panel}>
          <h2 className="mb-4 text-lg font-semibold">
            Transferir entre contas
          </h2>
          <p className="mb-3 text-sm text-slate-500">
            Transferencias alteram os saldos das contas sem entrar como receita
            ou despesa.
          </p>
          {active.length < 2 ? (
            <p>Cadastre duas contas para transferir.</p>
          ) : (
            <MutationForm endpoint="/transfers" notify={notify} onSaved={saved}>
              <Field label="Origem">
                <select className={control} name="fromAccountId" required>
                  {active.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Destino">
                <select
                  className={control}
                  name="toAccountId"
                  defaultValue={active[1]?.id}
                  required
                >
                  {active.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Valor">
                <input
                  className={control}
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </Field>
              <Field label="Data">
                <LocalDateInput />
              </Field>
            </MutationForm>
          )}
        </section>
      </div>
      <section className={panel}>
        <h2 className="mb-4 text-lg font-semibold">Saldos por conta</h2>
        {!ready ? (
          <p>Carregando...</p>
        ) : !accounts.length ? (
          <p>
            Cadastre sua primeira conta e selecione-a ao registrar
            movimentações.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {accounts.map((account) => (
              <article
                key={account.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
              >
                <h3 className="font-semibold">
                  {account.name} {account.archived && "(arquivada)"}
                </h3>
                <p className="text-sm text-slate-500">{account.institution}</p>
                <p className="my-3 text-2xl font-semibold">
                  {money(account.balance)}
                </p>
                <div className="flex gap-4 text-sm">
                  <button
                    className="underline"
                    onClick={() => setEditing(account)}
                  >
                    Editar
                  </button>
                  <button
                    className="underline"
                    disabled={busy}
                    onClick={() => void archive(account)}
                  >
                    {account.archived ? "Reativar" : "Arquivar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className={panel}>
        <h2 className="mb-4 text-lg font-semibold">Transferencias</h2>
        {!transfers.length && <p>Nenhuma transferencia registrada.</p>}
        {transfers.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-3 dark:border-slate-700"
          >
            <div>
              <p>
                {item.fromAccount.name} → {item.toAccount.name}
              </p>
              <p className="text-sm text-slate-500">{dateLabel(item.date)}</p>
            </div>
            <span>{money(item.amount)}</span>
            <button
              disabled={busy}
              onClick={() => void removeTransfer(item.id)}
              className="text-sm text-red-600"
            >
              Excluir transferencia
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
