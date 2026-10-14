import { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../api/client";
import { Account } from "./AccountsPage";
import { Category } from "../types/finance";
import {
  action,
  control,
  Field,
  Notify,
  panel,
} from "../components/FinanceForms";
import { dateLabel, money } from "../utils/format";

type PreviewRow = {
  description: string;
  amount: number;
  date: string;
  type: "INCOME" | "EXPENSE";
  externalId?: string;
  categoryId?: string;
  duplicate: boolean;
  matchingTransactionId?: string;
};
export default function ImportPage({
  categories,
  notify,
  onRefresh,
}: {
  categories: Category[];
  notify: Notify;
  onRefresh: () => Promise<unknown>;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<"CSV" | "OFX">("CSV");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    date: 0,
    description: 1,
    amount: 2,
    type: -1,
  });
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void api
      .get<Account[]>("/accounts")
      .then((response) =>
        setAccounts(response.data.filter((item) => !item.archived)),
      )
      .catch(() => notify("error", "Não foi possível carregar as contas."));
  }, []);
  function invalidate() {
    setRows([]);
    setSelected([]);
  }
  async function readFile(file?: File) {
    invalidate();
    setContent("");
    setHeaders([]);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify("error", "Use um arquivo de até 2 MB.");
      return;
    }
    const data = await file.text();
    setContent(data);
    const nextFormat = file.name.toLowerCase().endsWith(".ofx") ? "OFX" : "CSV";
    setFormat(nextFormat);
    if (nextFormat === "CSV") {
      const first = data.replace(/^\uFEFF/, "").split(/\r?\n/)[0];
      const delimiter =
        (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0)
          ? ";"
          : ",";
      const columns = first
        .split(delimiter)
        .map((value) => value.replace(/^"|"$/g, "").trim());
      setHeaders(columns);
      const normalized = columns.map((value) =>
        value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
      );
      const find = (names: string[], fallback: number) => {
        const index = normalized.findIndex((value) => names.includes(value));
        return index < 0 ? fallback : index;
      };
      setMapping({
        date: find(["data", "date"], 0),
        description: find(["descrição", "description", "histórico"], 1),
        amount: find(["valor", "amount"], 2),
        type: find(["tipo", "type"], -1),
      });
    }
  }
  function errorMessage(error: unknown) {
    return axios.isAxiosError(error)
      ? (error.response?.data?.message ??
          "Não foi possível importar o extrato.")
      : "Não foi possível importar o extrato.";
  }
  async function preview() {
    try {
      setBusy(true);
      const response = await api.post<PreviewRow[]>("/imports/preview", {
        accountId,
        content,
        format,
        mapping: format === "CSV" ? mapping : undefined,
      });
      setRows(response.data);
      setSelected(response.data.map((_, index) => index));
    } catch (error) {
      notify("error", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    try {
      setBusy(true);
      const response = await api.post("/imports/confirm", {
        accountId,
        rows: selected.map((index) => rows[index]),
      });
      notify(
        "success",
        `${response.data.imported} novas movimentações; ${response.data.reconciled} existentes conciliadas.`,
      );
      invalidate();
      setContent("");
      await onRefresh();
    } catch (error) {
      notify("error", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-5">
      <section className={panel}>
        <h2 className="mb-3 text-lg font-semibold">
          Importar extrato e conciliar
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          CSV aceita datas DD/MM/AAAA ou AAAA-MM-DD e valores brasileiros. Sem
          coluna de tipo, valores positivos sao receitas e negativos sao
          despesas. OFX usa os identificadores do banco.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Conta do extrato">
            <select
              className={control}
              value={accountId}
              disabled={busy}
              onChange={(event) => {
                setAccountId(event.target.value);
                invalidate();
              }}
            >
              <option value="">Selecione uma conta</option>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Arquivo CSV ou OFX">
            <input
              className={control}
              disabled={busy}
              type="file"
              accept=".csv,.ofx"
              onChange={(event) => {
                void readFile(event.target.files?.[0]).catch(() =>
                  notify("error", "Não foi possível ler o arquivo."),
                );
              }}
            />
          </Field>
        </div>
        {format === "CSV" && headers.length > 0 && (
          <div className="my-4 grid gap-3 md:grid-cols-4">
            {(["date", "description", "amount", "type"] as const).map((key) => (
              <Field
                key={key}
                label={
                  {
                    date: "Coluna de data",
                    description: "Coluna de descrição",
                    amount: "Coluna de valor",
                    type: "Coluna de tipo (opcional)",
                  }[key]
                }
              >
                <select
                  className={control}
                  value={mapping[key]}
                  disabled={busy}
                  onChange={(event) => {
                    setMapping({
                      ...mapping,
                      [key]: Number(event.target.value),
                    });
                    invalidate();
                  }}
                >
                  {key === "type" && (
                    <option value="-1">Pelo sinal do valor</option>
                  )}
                  {headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Coluna ${index + 1}`}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        )}
        <button
          className={`${action} mt-4`}
          disabled={!accountId || !content || busy}
          onClick={() => void preview()}
        >
          {busy ? "Processando..." : "Analisar extrato"}
        </button>
      </section>
      {rows.length > 0 && (
        <section className={panel}>
          <h2 className="mb-3 text-lg font-semibold">
            Revise antes de confirmar
          </h2>
          <p className="mb-3 text-sm">
            {rows.length} registros ·{" "}
            {rows.filter((row) => row.duplicate).length} possiveis duplicatas.
            Duplicatas selecionadas conciliam o lançamento existente.
          </p>
          <div className="mb-3 flex gap-4">
            <button
              className="text-sm underline"
              disabled={busy}
              onClick={() => setSelected(rows.map((_, index) => index))}
            >
              Selecionar todos
            </button>
            <button
              className="text-sm underline"
              disabled={busy}
              onClick={() => setSelected([])}
            >
              Limpar seleção
            </button>
          </div>
          <div className="max-h-[32rem] overflow-auto">
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid gap-2 border-b border-slate-200 py-3 dark:border-slate-700 md:grid-cols-[2fr_1fr]"
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={selected.includes(index)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, index]
                          : selected.filter((value) => value !== index),
                      )
                    }
                  />
                  <span>
                    {row.description}
                    <small className="block text-slate-500">
                      {dateLabel(row.date)} ·{" "}
                      {row.type === "INCOME" ? "Receita" : "Despesa"} ·{" "}
                      {money(row.amount)}{" "}
                      {row.duplicate ? "· Ja existente ou repetido" : "· Novo"}
                    </small>
                  </span>
                </label>
                <select
                  aria-label={`Categoria de ${row.description}`}
                  className={control}
                  disabled={busy}
                  value={row.categoryId ?? ""}
                  onChange={(event) =>
                    setRows(
                      rows.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              categoryId: event.target.value || undefined,
                            }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">Sem categoria</option>
                  {categories
                    .filter(
                      (item) =>
                        !item.archived &&
                        (!item.type || item.type === row.type),
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </div>
          <button
            className={`${action} mt-4`}
            disabled={!selected.length || busy}
            onClick={() => void confirm()}
          >
            Confirmar {selected.length} registros
          </button>
        </section>
      )}
    </div>
  );
}
