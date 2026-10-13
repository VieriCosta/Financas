export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export function money(value: number | string) {
  return currency.format(Number(value));
}

export function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data invalida";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
