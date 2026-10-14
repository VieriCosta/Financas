import { FormEvent, useEffect, useState } from "react";
import axios from "axios";

import {
  Download,
  Edit3,
  Paperclip,
  Plus,
  Search,
  Save,
  X,
} from "lucide-react";
import { api } from "../api/client";

import {
  Category,
  PaginatedTransactions,
  Tag,
  Transaction,
} from "../types/finance";
import { dateLabel, money } from "../utils/format";
import { TransactionFilters, RefreshedData } from "../types/dashboard";
import { Account } from "../pages/AccountsPage";

import {
  Panel,
  IconButton,
  EmptyState,
  Pagination,
  ActionButton,
  SubmitButton,
  categoryMatchesTransactionType,
  getApiErrorMessage,
  Input,
  Select,
} from "./FinanceUI";

export function TransactionsView({
  categories,
  tags,
  filters,
  setFilters,
  transactions,
  pagination,
  saving,
  onSubmit,
  onUpdate,
  onRemove,
  onPageChange,
  onExportCsv,
  onRefresh,
  notify,
}: {
  categories: Category[];
  tags: Tag[];
  filters: TransactionFilters;
  setFilters: (filters: TransactionFilters) => void;
  transactions: Transaction[];
  pagination: PaginatedTransactions;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdate: (
    transactionId: string,
    payload: Record<string, number | string | null | undefined>,
  ) => Promise<void>;
  onRemove: (transaction: Transaction) => void;
  onPageChange: (page: number) => Promise<void>;
  onExportCsv: () => Promise<void>;
  onRefresh: () => Promise<RefreshedData | null>;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    void api
      .get<Account[]>("/accounts")
      .then((response) =>
        setAccounts(response.data.filter((item) => !item.archived)),
      )
      .catch(() => notify("error", "Não foi possível carregar as contas."));
  }, []);
  const [newTransactionType, setNewTransactionType] =
    useState<Transaction["type"]>("EXPENSE");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const newTransactionCategories = categories.filter((category) =>
    categoryMatchesTransactionType(category, newTransactionType),
  );

  async function bulk(action: "DELETE" | "ADD_TAG", tagId?: string) {
    if (!selectedIds.length) return;
    try {
      await api.post("/transactions/bulk", { ids: selectedIds, action, tagId });
      setSelectedIds([]);
      await onRefresh();
      notify("success", "Movimentações atualizadas em lote.");
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(
          error,
          "Não foi possível atualizar os itens selecionados.",
        ),
      );
    }
  }

  async function createTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api.post("/tags", {
      name: form.get("name"),
      color: form.get("color"),
    });
    formElement.reset();
    await onRefresh();
    notify("success", "Tag criada.");
  }

  async function uploadAttachment(transactionId: string, file: File) {
    try {
      await api.post(`/transactions/${transactionId}/attachments`, file, {
        headers: { "Content-Type": file.type, "X-Filename": file.name },
      });
      await onRefresh();
      notify("success", "Comprovante anexado.");
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(error, "Não foi possível anexar o comprovante."),
      );
    }
  }

  async function downloadAttachment(attachment: {
    id: string;
    filename: string;
  }) {
    const { data } = await api.get(`/attachments/${attachment.id}`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Nova movimentação">
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Input name="description" placeholder="Descrição" />
          <Input name="amount" placeholder="Valor" type="number" step="0.01" />
          <Select
            name="type"
            value={newTransactionType}
            onChange={(value) =>
              setNewTransactionType(value as Transaction["type"])
            }
            options={[
              ["INCOME", "Receita"],
              ["EXPENSE", "Despesa"],
            ]}
          />
          <Select
            name="categoryId"
            options={[
              [
                "",
                newTransactionType === "INCOME"
                  ? "Categoria de receita"
                  : "Categoria de despesa",
              ],
              ...newTransactionCategories.map(
                (item) => [item.id, item.name] as [string, string],
              ),
            ]}
          />
          <Select
            name="accountId"
            options={[
              ["", "Sem conta vinculada"],
              ...accounts.map(
                (item) => [item.id, item.name] as [string, string],
              ),
            ]}
          />
          <Input name="date" type="date" />
          <SubmitButton disabled={saving}>
            <Plus size={18} /> Adicionar
          </SubmitButton>
        </form>
      </Panel>

      <Panel title="Histórico de movimentações">
        {pagination.summary && (
          <p className="mb-4 text-sm">
            Total nos filtros: {pagination.total} registros · receitas{" "}
            {money(pagination.summary.income)} · despesas{" "}
            {money(pagination.summary.expense)} · resultado{" "}
            {money(pagination.summary.income - pagination.summary.expense)}
          </p>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <Search size={16} />
            <select
              aria-label="Mês do histórico"
              value={filters.month}
              onChange={(event) =>
                setFilters({ ...filters, month: event.target.value })
              }
              className="bg-transparent outline-none"
            >
              <option value="">Todos os meses</option>
              {Array.from({ length: 12 }).map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Date(2026, index, 1).toLocaleDateString("pt-BR", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </label>
          <input
            aria-label="Ano do histórico"
            type="number"
            min="2000"
            max="2200"
            placeholder="Todos os anos"
            value={filters.year}
            onChange={(event) =>
              setFilters({ ...filters, year: event.target.value })
            }
            className="h-10 w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
          />
          <Select
            name="filterType"
            value={filters.type}
            onChange={(value) => setFilters({ ...filters, type: value })}
            options={[
              ["", "Todos"],
              ["INCOME", "Receitas"],
              ["EXPENSE", "Despesas"],
            ]}
          />
          <Select
            name="filterAccount"
            value={filters.accountId}
            onChange={(value) => setFilters({ ...filters, accountId: value })}
            options={[
              ["", "Todas as contas"],
              ...accounts.map(
                (item) => [item.id, item.name] as [string, string],
              ),
            ]}
          />
          <Select
            name="filterReconciled"
            value={filters.reconciled}
            onChange={(value) => setFilters({ ...filters, reconciled: value })}
            options={[
              ["", "Toda conciliação"],
              ["true", "Conciliadas"],
              ["false", "Não conciliadas"],
            ]}
          />
          <input
            aria-label="Buscar movimentações"
            value={filters.search}
            onChange={(event) =>
              setFilters({ ...filters, search: event.target.value })
            }
            placeholder="Buscar"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
          />
          <Select
            name="categoryFilter"
            value={filters.categoryId}
            onChange={(value) => setFilters({ ...filters, categoryId: value })}
            options={[
              ["", "Categorias"],
              ...categories.map(
                (item) => [item.id, item.name] as [string, string],
              ),
            ]}
          />
          <Select
            name="tagFilter"
            value={filters.tagId}
            onChange={(value) => setFilters({ ...filters, tagId: value })}
            options={[
              ["", "Tags"],
              ...tags.map((item) => [item.id, item.name] as [string, string]),
            ]}
          />
          <input
            value={filters.minAmount}
            onChange={(event) =>
              setFilters({ ...filters, minAmount: event.target.value })
            }
            type="number"
            placeholder="Valor mínimo"
            className="h-10 w-32 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
          />
          <input
            value={filters.maxAmount}
            onChange={(event) =>
              setFilters({ ...filters, maxAmount: event.target.value })
            }
            type="number"
            placeholder="Valor máximo"
            className="h-10 w-32 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={onExportCsv}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download size={16} /> CSV
          </button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            disabled={!selectedIds.length}
            onClick={() => void bulk("DELETE")}
            className="h-9 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600 disabled:opacity-40"
          >
            Excluir selecionadas
          </button>
          {tags
            .filter((tag) => !tag.archived)
            .map((tag) => (
              <button
                key={tag.id}
                disabled={!selectedIds.length}
                onClick={() => void bulk("ADD_TAG", tag.id)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40 dark:border-slate-800"
              >
                + {tag.name}
              </button>
            ))}
          <form onSubmit={createTag} className="ml-auto flex gap-2">
            <input
              name="name"
              required
              placeholder="Nova tag"
              className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
            />
            <input
              name="color"
              type="color"
              defaultValue="#2563eb"
              className="h-9 w-10"
            />
            <button className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white">
              Criar tag
            </button>
          </form>
        </div>
        <TransactionList
          accounts={accounts}
          transactions={transactions}
          categories={categories}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onUpload={uploadAttachment}
          onDownload={downloadAttachment}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
        <Pagination pagination={pagination} onPageChange={onPageChange} />
      </Panel>
    </div>
  );
}

export function TransactionList({
  transactions,
  accounts,
  categories,
  selectedIds,
  onSelectionChange,
  onUpload,
  onDownload,
  onUpdate,
  onRemove,
}: {
  transactions: Transaction[];
  categories?: Category[];
  accounts?: Account[];
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onUpload?: (transactionId: string, file: File) => Promise<void>;
  onDownload?: (attachment: { id: string; filename: string }) => Promise<void>;
  onUpdate?: (
    transactionId: string,
    payload: Record<string, number | string | null | undefined>,
  ) => Promise<void>;
  onRemove?: (transaction: Transaction) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] =
    useState<Transaction["type"]>("EXPENSE");

  if (!transactions.length) {
    return (
      <EmptyState text="Nenhuma movimentação encontrada para este filtro." />
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((item) => {
        const isEditing = editingId === item.id;

        if (isEditing && categories && onUpdate) {
          const editCategories = categories.filter((category) =>
            categoryMatchesTransactionType(category, editingType),
          );

          return (
            <form
              key={item.id}
              className="grid gap-3 rounded-lg border border-blue-100 p-3 dark:border-blue-500/30 sm:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                await onUpdate(item.id, {
                  description: String(form.get("description")),
                  amount: Number(form.get("amount")),
                  type: String(form.get("type")),
                  date: String(form.get("date")),
                  categoryId: String(form.get("categoryId") || "") || null,
                  accountId: String(form.get("accountId") || "") || null,
                });
                setEditingId(null);
              }}
            >
              <Input name="description" defaultValue={item.description} />
              <Input
                name="amount"
                type="number"
                step="0.01"
                defaultValue={Number(item.amount)}
              />
              <Select
                name="type"
                value={editingType}
                onChange={(value) =>
                  setEditingType(value as Transaction["type"])
                }
                options={[
                  ["INCOME", "Receita"],
                  ["EXPENSE", "Despesa"],
                ]}
              />
              <Select
                name="categoryId"
                defaultValue={item.category?.id ?? ""}
                options={[
                  ["", "Sem categoria"],
                  ...editCategories.map(
                    (category) =>
                      [category.id, category.name] as [string, string],
                  ),
                ]}
              />
              <Select
                name="accountId"
                defaultValue={item.accountId ?? ""}
                options={[
                  ["", "Sem conta vinculada"],
                  ...(accounts ?? []).map(
                    (account) => [account.id, account.name] as [string, string],
                  ),
                ]}
              />
              <Input
                name="date"
                type="date"
                defaultValue={String(item.date).slice(0, 10)}
              />
              <div className="flex gap-2">
                <button
                  className="grid h-11 w-11 place-items-center rounded-lg bg-blue-600 text-white"
                  title="Salvar"
                  aria-label="Salvar"
                >
                  <Save size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                  title="Cancelar"
                  aria-label="Cancelar"
                >
                  <X size={17} />
                </button>
              </div>
            </form>
          );
        }

        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-transparent"
          >
            {onSelectionChange && !item.creditCardId && (
              <input
                aria-label={`Selecionar ${item.description}`}
                type="checkbox"
                checked={selectedIds?.includes(item.id) ?? false}
                onChange={(event) =>
                  onSelectionChange(
                    event.target.checked
                      ? [...(selectedIds ?? []), item.id]
                      : (selectedIds ?? []).filter((id) => id !== item.id),
                  )
                }
                className="h-4 w-4 accent-blue-600"
              />
            )}
            <div>
              <p className="font-medium">{item.description}</p>
              {item.creditCardId && (
                <p className="text-xs text-blue-500">
                  Compra vinculada ao cartão
                </p>
              )}
              {item.reconciled && (
                <p className="text-xs text-emerald-600">
                  Conciliada com o extrato
                </p>
              )}
              <p className="text-sm text-slate-500">
                {item.category?.name ?? "Sem categoria"} -{" "}
                {dateLabel(item.date)}
              </p>
              {item.tags?.length ? (
                <p className="mt-1 text-xs text-blue-600">
                  {item.tags.map(({ tag }) => `#${tag.name}`).join(" ")}
                </p>
              ) : null}
              {item.attachments?.length ? (
                <p className="mt-1 flex flex-wrap gap-2 text-xs text-blue-600">
                  {item.attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      onClick={() => void onDownload?.(attachment)}
                      className="underline"
                    >
                      {attachment.filename}
                    </button>
                  ))}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={
                  item.type === "INCOME"
                    ? "font-semibold text-emerald-600"
                    : "font-semibold text-red-500"
                }
              >
                {item.type === "INCOME" ? "+" : "-"} {money(item.amount)}
              </span>
              {onUpdate && !item.creditCardId && (
                <ActionButton
                  label="Editar movimentação"
                  onClick={() => {
                    setEditingType(item.type);
                    setEditingId(item.id);
                  }}
                >
                  <Edit3 size={16} />
                </ActionButton>
              )}
              {onUpload && (
                <label
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300"
                  title="Anexar comprovante"
                >
                  <Paperclip size={16} />
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void onUpload(item.id, file);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
              {onRemove && !item.creditCardId && (
                <IconButton
                  label="Remover movimentação"
                  onClick={() => onRemove(item)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
