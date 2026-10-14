import { useState } from "react";
import { action, panel } from "./FinanceForms";
export function Onboarding({
  onNavigate,
}: {
  onNavigate: (view: "accounts" | "transactions" | "import") => void;
}) {
  const [example, setExample] = useState(false);
  return (
    <section className={panel}>
      <h2 className="mb-2 text-xl font-semibold">
        Comece seu controle financeiro
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Cadastre uma conta com seu saldo inicial e depois registre receitas e
        despesas. Se tiver um extrato, você pode importa-lo e revisar antes de
        confirmar.
      </p>
      <div className="flex flex-wrap gap-3">
        <button className={action} onClick={() => onNavigate("accounts")}>
          1. Cadastrar conta
        </button>
        <button className={action} onClick={() => onNavigate("transactions")}>
          2. Registrar movimentação
        </button>
        <button
          className="text-sm underline"
          onClick={() => onNavigate("import")}
        >
          Importar um extrato
        </button>
        <button
          className="text-sm underline"
          aria-expanded={example}
          onClick={() => setExample(!example)}
        >
          {example ? "Ocultar exemplo" : "Ver um exemplo"}
        </button>
      </div>
      {example && (
        <div className="mt-4 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
          <strong>Exemplo ilustrativo</strong>
          <p className="mt-2">
            Saldo inicial de R$ 1.000,00 + receita de R$ 3.000,00 − despesa de
            R$ 250,00 = saldo de R$ 3.750,00.
          </p>
          <p className="mt-1 text-slate-500">
            Transferir R$ 200,00 para uma carteira altera os saldos de cada
            conta e preserva o total. Estes valores servem apenas para
            demonstração.
          </p>
        </div>
      )}
    </section>
  );
}
