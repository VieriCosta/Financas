import { useState } from "react";
import axios from "axios";
import { api } from "../api/client";
import {
  action,
  control,
  Field,
  Notify,
  panel,
} from "../components/FinanceForms";

export default function BackupPage({
  notify,
  onRefresh,
}: {
  notify: Notify;
  onRefresh: () => Promise<unknown>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  async function download() {
    try {
      setBusy(true);
      const response = await api.get("/data/backup", {
        responseType: "blob",
        timeout: 120000,
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `finanças-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      notify("success", "Backup exportado.");
    } catch {
      notify("error", "Não foi possível exportar o backup.");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!file || !accepted) return;
    try {
      setBusy(true);
      if (file.size > 30 * 1024 * 1024)
        throw new Error("Use um backup de até 30 MB.");
      const data = JSON.parse(await file.text());
      const response = await api.post("/data/restore", data, {
        timeout: 180000,
      });
      notify("success", `${response.data.restored} registros restaurados.`);
      setFile(null);
      setAccepted(false);
      await onRefresh();
    } catch (error) {
      notify(
        "error",
        axios.isAxiosError(error)
          ? (error.response?.data?.message ?? "Não foi possível restaurar.")
          : error instanceof Error
            ? error.message
            : "Backup inválido.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className={panel}>
        <h2 className="mb-3 text-lg font-semibold">Exportar meus dados</h2>
        <p className="mb-4 text-sm text-slate-500">
          O arquivo inclui contas, cartões, movimentações, transferencias,
          faturas, metas, investimentos, planejamento, tags e comprovantes.
          Senhas e sessões ficam fora do backup. Guarde-o em local privado.
        </p>
        <button
          className={action}
          disabled={busy}
          onClick={() => void download()}
        >
          Baixar backup JSON
        </button>
      </section>
      <section className={panel}>
        <h2 className="mb-3 text-lg font-semibold">Restaurar backup</h2>
        <p className="mb-4 text-sm text-slate-500">
          A restauração funciona em uma conta sem dados financeiros. Categorias
          padrão compatíveis sao reaproveitadas. O arquivo e validado antes da
          gravacao e qualquer falha desfaz toda a restauração.
        </p>
        <Field label="Arquivo de backup">
          <input
            className={control}
            type="file"
            accept=".json"
            disabled={busy}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setAccepted(false);
            }}
          />
        </Field>
        <label className="my-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            disabled={busy}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>Quero restaurar este arquivo na minha conta vazia.</span>
        </label>
        <button
          className={action}
          disabled={busy || !file || !accepted}
          onClick={() => void restore()}
        >
          {busy ? "Processando..." : "Restaurar dados"}
        </button>
      </section>
    </div>
  );
}
