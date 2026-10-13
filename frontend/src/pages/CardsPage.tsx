import { useEffect, useState } from "react";
import { api } from "../api/client";
import { money, dateLabel } from "../utils/format";
import { Category } from "../types/finance";
import { Account } from "./AccountsPage";
import { control, Field, LocalDateInput, MutationForm, Notify, panel } from "../components/FinanceForms";

type Card = { id: string; name: string; limitAmount: number; closingDay: number; dueDay: number; archived: boolean };
type Invoice = { month: string; total: number; paid: number; remaining: number; dueDate: string; items: Array<{ id: string; description: string; amount: number }> };
export default function CardsPage({ notify, categories, onRefresh }: { notify: Notify; categories: Category[]; onRefresh: () => Promise<unknown> }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editing, setEditing] = useState<Card | null>(null);
  async function load() { const [c, a] = await Promise.all([api.get<Card[]>("/credit-cards"), api.get<Account[]>("/accounts")]); setCards(c.data); setAccounts(a.data.filter(item => !item.archived)); if (!selected && c.data.length) setSelected(c.data[0].id); }
  async function loadInvoices() { if (selected) setInvoices((await api.get(`/credit-cards/${selected}/invoices`)).data); }
  useEffect(() => { void load().catch(() => notify("error", "Nao foi possivel carregar os cartoes.")); }, []);
  useEffect(() => { setInvoices([]); let disposed = false; if (selected) void api.get(`/credit-cards/${selected}/invoices`).then(response => { if (!disposed) setInvoices(response.data); }).catch(() => notify("error", "Nao foi possivel carregar as faturas.")); return () => { disposed = true; }; }, [selected]);
  async function saved() { setEditing(null); await load(); await loadInvoices(); await onRefresh(); }
  const card = cards.find(item => item.id === selected);
  const outstanding = invoices.reduce((sum, item) => sum + item.remaining, 0);
  return <div className="grid gap-5">
    <div className="grid gap-5 md:grid-cols-2">
      <section className={panel}><h2 className="mb-4 text-lg font-semibold">{editing ? "Editar cartao" : "Novo cartao"}</h2>
        <MutationForm key={editing?.id ?? "new"} endpoint={editing ? `/credit-cards/${editing.id}` : "/credit-cards"} method={editing ? "patch" : "post"} notify={notify} onSaved={saved}>
          <Field label="Nome"><input name="name" className={control} required minLength={2} maxLength={80} defaultValue={editing?.name} /></Field><Field label="Limite"><input className={control} name="limitAmount" type="number" step="0.01" min="0.01" defaultValue={editing?.limitAmount} required /></Field>
          <Field label="Dia de fechamento"><input className={control} name="closingDay" type="number" min="1" max="31" defaultValue={editing?.closingDay} required /></Field><Field label="Dia de vencimento"><input className={control} name="dueDay" type="number" min="1" max="31" defaultValue={editing?.dueDay} required /></Field>
        </MutationForm>{editing && <button className="mt-3 underline" onClick={() => setEditing(null)}>Cancelar</button>}
      </section>
      <section className={panel}><h2 className="mb-4 text-lg font-semibold">Compra no cartao</h2><Field label="Cartao"><select className={control} value={selected} onChange={event => setSelected(event.target.value)}><option value="">Selecione</option>{cards.map(item => <option key={item.id} value={item.id}>{item.name}{item.archived ? " (arquivado)" : ""}</option>)}</select></Field>
        {card && <><p className="my-3 text-sm">Limite disponivel: {money(Number(card.limitAmount) - outstanding)}. Compras a partir do dia {card.closingDay} entram na proxima fatura.</p><div className="mb-3 flex gap-4 text-sm"><button className="underline" onClick={() => setEditing(card)}>Editar cartao</button><button className="underline" onClick={() => { void api.patch(`/credit-cards/${card.id}`, { archived: !card.archived }).then(saved).catch(() => notify("error", "Nao foi possivel alterar o cartao.")); }}>{card.archived ? "Reativar" : "Arquivar"}</button></div></>}
        {card && !card.archived && <MutationForm endpoint={`/credit-cards/${selected}/purchases`} notify={notify} onSaved={saved} label="Registrar compra" transform={data => ({ ...data, categoryId: data.categoryId || undefined })}>
          <Field label="Descricao"><input className={control} name="description" minLength={2} maxLength={160} required /></Field><Field label="Valor total"><input className={control} name="totalAmount" type="number" min="0.01" step="0.01" required /></Field><Field label="Parcelas"><input className={control} name="installments" type="number" min="1" max="120" defaultValue="1" required /></Field><Field label="Data da compra"><LocalDateInput /></Field><Field label="Categoria"><select className={control} name="categoryId"><option value="">Sem categoria</option>{categories.filter(item => item.type !== "INCOME" && !item.archived).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        </MutationForm>}
      </section>
    </div>
    <section className={panel}><h2 className="mb-4 text-lg font-semibold">Faturas</h2><p className="mb-4 text-sm text-slate-500">As compras entram nas despesas. Pagar a fatura debita a conta escolhida sem duplicar a despesa.</p>{!invoices.length && <p>Selecione um cartao e registre uma compra para acompanhar suas faturas.</p>}<div className="grid gap-4 md:grid-cols-2">{invoices.map(invoice => <article key={invoice.month} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"><h3 className="font-semibold">Fatura {invoice.month} · vence {dateLabel(invoice.dueDate)}</h3><p className="my-2">Total {money(invoice.total)} · pago {money(invoice.paid)} · restante {money(invoice.remaining)}</p><ul className="mb-4 text-sm">{invoice.items.map(item => <li key={item.id} className="flex justify-between gap-2 py-1"><span>{item.description}</span><span>{money(item.amount)}</span></li>)}</ul>{invoice.remaining > 0 && (accounts.length ? <MutationForm key={`${invoice.month}-${invoice.remaining}`} endpoint={`/credit-cards/${selected}/payments`} notify={notify} onSaved={saved} label="Pagar fatura"><input name="invoiceMonth" type="hidden" value={invoice.month} /><Field label="Conta de pagamento"><select className={control} name="accountId" required>{accounts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Valor do pagamento"><input className={control} name="amount" type="number" min="0.01" max={invoice.remaining} step="0.01" defaultValue={invoice.remaining} required /></Field><Field label="Data do pagamento"><LocalDateInput /></Field></MutationForm> : <p>Cadastre uma conta para pagar a fatura.</p>)}</article>)}</div></section>
  </div>;
}
