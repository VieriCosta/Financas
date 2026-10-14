import { useState } from "react";
import { api } from "../api/client";
import { Category, Tag } from "../types/finance";
import {
  control,
  Field,
  MutationForm,
  Notify,
  panel,
} from "../components/FinanceForms";

export default function SettingsPage({
  categories,
  tags,
  notify,
  onRefresh,
}: {
  categories: Category[];
  tags: Tag[];
  notify: Notify;
  onRefresh: () => Promise<unknown>;
}) {
  const [category, setCategory] = useState<Category | null>(null);
  const [tag, setTag] = useState<Tag | null>(null);
  const [busy, setBusy] = useState(false);
  async function saved() {
    setCategory(null);
    setTag(null);
    await onRefresh();
  }
  async function archive(
    resource: "categories" | "tags",
    item: Category | Tag,
  ) {
    try {
      setBusy(true);
      await api.patch(`/${resource}/${item.id}`, { archived: !item.archived });
      await saved();
    } catch {
      notify("error", "Não foi possível alterar este item.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className={panel}>
        <h2 className="mb-4 text-lg font-semibold">
          {category ? "Editar categoria" : "Nova categoria"}
        </h2>
        <MutationForm
          key={category?.id ?? "new"}
          endpoint={category ? `/categories/${category.id}` : "/categories"}
          method={category ? "patch" : "post"}
          notify={notify}
          onSaved={saved}
          transform={(data) => ({ ...data, type: data.type || null })}
        >
          <Field label="Nome">
            <input
              className={control}
              name="name"
              minLength={2}
              maxLength={80}
              required
              defaultValue={category?.name}
            />
          </Field>
          <Field label="Cor">
            <input
              className={control}
              name="color"
              type="color"
              defaultValue={category?.color ?? "#2563eb"}
            />
          </Field>
          <Field label="Tipo">
            <select
              className={control}
              name="type"
              defaultValue={category?.type ?? ""}
            >
              <option value="">Receitas e despesas</option>
              <option value="INCOME">Receitas</option>
              <option value="EXPENSE">Despesas</option>
            </select>
          </Field>
        </MutationForm>
        {category && (
          <button className="mt-3 underline" onClick={() => setCategory(null)}>
            Cancelar
          </button>
        )}
        <div className="mt-5">
          {categories.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap justify-between gap-3 border-b border-slate-200 py-3 text-sm dark:border-slate-700"
            >
              <span>
                <span style={{ color: item.color }}>●</span> {item.name}
                {item.archived ? " (arquivada)" : ""}
              </span>
              <div className="flex gap-3">
                <button className="underline" onClick={() => setCategory(item)}>
                  Editar
                </button>
                <button
                  className="underline"
                  disabled={busy}
                  onClick={() => void archive("categories", item)}
                >
                  {item.archived ? "Reativar" : "Arquivar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className={panel}>
        <h2 className="mb-4 text-lg font-semibold">
          {tag ? "Editar tag" : "Nova tag"}
        </h2>
        <MutationForm
          key={tag?.id ?? "new"}
          endpoint={tag ? `/tags/${tag.id}` : "/tags"}
          method={tag ? "patch" : "post"}
          notify={notify}
          onSaved={saved}
        >
          <Field label="Nome">
            <input
              className={control}
              name="name"
              minLength={1}
              maxLength={40}
              required
              defaultValue={tag?.name}
            />
          </Field>
          <Field label="Cor">
            <input
              className={control}
              name="color"
              type="color"
              defaultValue={tag?.color ?? "#2563eb"}
            />
          </Field>
        </MutationForm>
        {tag && (
          <button className="mt-3 underline" onClick={() => setTag(null)}>
            Cancelar
          </button>
        )}
        <div className="mt-5">
          {tags.map((item) => (
            <div
              key={item.id}
              className="flex justify-between gap-3 border-b border-slate-200 py-3 text-sm dark:border-slate-700"
            >
              <span>
                {item.name}
                {item.archived ? " (arquivada)" : ""}
              </span>
              <div className="flex gap-3">
                <button className="underline" onClick={() => setTag(item)}>
                  Editar
                </button>
                <button
                  className="underline"
                  disabled={busy}
                  onClick={() => void archive("tags", item)}
                >
                  {item.archived ? "Reativar" : "Arquivar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
