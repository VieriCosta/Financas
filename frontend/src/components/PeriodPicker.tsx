import { control, Field } from "./FinanceForms";
export function PeriodPicker({ month, year, onChange }: { month: number; year: number; onChange: (month: number, year: number) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2"><Field label="Mes"><select className={control} value={month} onChange={event => onChange(Number(event.target.value), year)}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{new Date(2026, index, 1).toLocaleDateString("pt-BR", { month: "long" })}</option>)}</select></Field><Field label="Ano"><input className={control} value={year} type="number" min="2000" max="2200" onChange={event => { const next = Number(event.target.value); if (next >= 2000 && next <= 2200) onChange(month, next); }} /></Field></div>;
}
