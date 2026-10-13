import { FormEvent, ReactNode, useState } from "react";
import axios from "axios";
import { api } from "../api/client";

export const control = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
export const action = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
export const panel = "surface-card rounded-xl p-5";
export type Notify = (type: "success" | "error", message: string) => void;
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-1 text-sm"><span>{label}</span>{children}</label>; }
export function MutationForm({ endpoint, children, onSaved, notify, method = "post", transform, label = "Salvar" }: { endpoint: string; children: ReactNode; onSaved: () => Promise<unknown>; notify: Notify; method?: "post" | "patch"; transform?: (data: Record<string, FormDataEntryValue>) => object; label?: string }) {
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const data = Object.fromEntries(new FormData(element));
    try { setSaving(true); await api[method](endpoint, transform ? transform(data) : data); element.reset(); await onSaved(); notify("success", "Dados salvos."); }
    catch (error) { notify("error", axios.isAxiosError(error) ? error.response?.data?.message ?? "Nao foi possivel salvar." : "Nao foi possivel salvar."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="grid gap-3">{children}<button className={action} disabled={saving}>{saving ? "Salvando..." : label}</button></form>;
}
export function LocalDateInput({ name = "date" }: { name?: string }) {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return <input className={control} name={name} type="date" defaultValue={date} required />;
}
