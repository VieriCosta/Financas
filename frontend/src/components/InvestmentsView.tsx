import { investmentTypeOptions } from "./FinanceUI";
import { FormEvent, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PiggyBank, TrendingUp, WalletCards } from "lucide-react";

import { DashboardData, Investment } from "../types/finance";
import { dateLabel, money } from "../utils/format";

import {
  readInvestmentPayload,
  investmentNamePlaceholder,
  numberDefault,
  Metric,
  Panel,
  IconButton,
  EmptyState,
  SubmitButton,
  getEffectiveMonthlyRate,
  estimateMonthlyReturn,
  investmentTypeLabel,
  Input,
  Select,
} from "./FinanceUI";

export function InvestmentsView({
  investments,
  monthlySeries,
  saving,
  onSubmit,
  onUpdate,
  onRemove,
}: {
  investments: Investment[];
  monthlySeries: DashboardData["monthlySeries"];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdate: (
    investmentId: string,
    payload: Record<string, number | string | undefined>,
  ) => Promise<void>;
  onRemove: (investment: Investment) => void;
}) {
  const projectedReturn = investments.reduce(
    (sum, investment) => sum + estimateMonthlyReturn(investment),
    0,
  );
  const [selectedType, setSelectedType] =
    useState<Investment["type"]>("FIXED_INCOME");

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Novo investimento ou aporte">
        <form onSubmit={onSubmit} className="grid gap-3">
          <Input
            name="name"
            placeholder={investmentNamePlaceholder(selectedType)}
          />
          <Select
            name="type"
            value={selectedType}
            onChange={(value) => setSelectedType(value as Investment["type"])}
            options={investmentTypeOptions}
          />
          <InvestmentFields type={selectedType} />
          <SubmitButton disabled={saving}>Registrar investimento</SubmitButton>
        </form>
      </Panel>

      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-3">
          <Metric
            title="Ativos cadastrados"
            value={String(investments.length)}
            icon={<TrendingUp />}
            tone="blue"
          />
          <Metric
            title="Rendimento estimado"
            value={money(projectedReturn)}
            icon={<PiggyBank />}
            tone="green"
          />
          <Metric
            title="Patrimonio investido"
            value={money(
              investments.reduce(
                (sum, item) => sum + Number(item.currentValue),
                0,
              ),
            )}
            icon={<WalletCards />}
            tone="slate"
          />
        </section>

        <Panel title="Investimentos cadastrados">
          <div className="space-y-4">
            {investments.length ? (
              investments.map((investment) => (
                <InvestmentCard
                  key={investment.id}
                  investment={investment}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              ))
            ) : (
              <EmptyState text="Nenhum investimento cadastrado ainda." />
            )}
          </div>
        </Panel>

        <Panel title="Evolucao de aportes">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="receitas" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function InvestmentCard({
  investment,
  onUpdate,
  onRemove,
}: {
  investment: Investment;
  onUpdate: (
    investmentId: string,
    payload: Record<string, number | string | undefined>,
  ) => Promise<void>;
  onRemove: (investment: Investment) => void;
}) {
  const effectiveMonthlyRate = getEffectiveMonthlyRate(investment);
  const monthlyReturn = estimateMonthlyReturn(investment);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-transparent">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">{investment.name}</p>
          <p className="text-sm text-slate-500">
            {investmentTypeLabel(investment.type)} -{" "}
            {money(investment.currentValue)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Rende aprox. {effectiveMonthlyRate.toFixed(2)}% ao mês (
            {money(monthlyReturn)})
          </p>
          <InvestmentDetails investment={investment} />
        </div>
        <div className="flex items-center gap-2">
          {investment.cdiPercent && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              CDI {Number(investment.cdiPercent ?? 100).toFixed(0)}%
            </span>
          )}
          <IconButton
            label="Remover investimento"
            onClick={() => onRemove(investment)}
          />
        </div>
      </div>

      <form
        className="grid gap-3 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onUpdate(investment.id, readInvestmentPayload(form));
        }}
      >
        <InvestmentFields
          type={investment.type}
          investment={investment}
          compact
        />
        <button className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800">
          Salvar edição
        </button>
      </form>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const amount = Number(form.get("addContribution"));
          if (!amount || amount <= 0) return;
          onUpdate(investment.id, { addContribution: amount });
          event.currentTarget.reset();
        }}
      >
        <input
          name="addContribution"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Adicionar aporte"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950"
        />
        <button className="h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700">
          Adicionar
        </button>
      </form>
    </div>
  );
}

export function InvestmentFields({
  type,
  investment,
  compact = false,
}: {
  type: Investment["type"];
  investment?: Investment;
  compact?: boolean;
}) {
  const gridClass = compact ? "contents" : "grid gap-3";

  return (
    <div className={gridClass}>
      <Input
        name="currentValue"
        placeholder="Valor atual"
        type="number"
        step="0.01"
        defaultValue={numberDefault(investment?.currentValue)}
      />
      <Input
        name="investedAmount"
        placeholder="Valor investido"
        type="number"
        step="0.01"
        defaultValue={numberDefault(investment?.investedAmount)}
      />
      <Input
        name="contribution"
        placeholder="Aporte do mês"
        type="number"
        step="0.01"
        required={false}
        defaultValue={numberDefault(investment?.contribution)}
      />

      {(type === "STOCK" || type === "CRYPTO") && (
        <>
          <Input
            name="ticker"
            placeholder={
              type === "STOCK" ? "Ticker (ex: PETR4)" : "Simbolo (ex: BTC)"
            }
            defaultValue={investment?.ticker ?? ""}
          />
          <Input
            name="quantity"
            placeholder="Quantidade"
            type="number"
            step="0.00000001"
            defaultValue={numberDefault(investment?.quantity)}
          />
          <Input
            name="averagePrice"
            placeholder="Preco medio"
            type="number"
            step="0.00000001"
            required={false}
            defaultValue={numberDefault(investment?.averagePrice)}
          />
        </>
      )}

      {type === "STOCK" && (
        <Input
          name="broker"
          placeholder="Corretora"
          required={false}
          defaultValue={investment?.broker ?? ""}
        />
      )}

      {type === "CRYPTO" && (
        <>
          <Input
            name="custodyLocation"
            placeholder="Custodia (corretora ou carteira)"
            required={false}
            defaultValue={investment?.custodyLocation ?? ""}
          />
          <Input
            name="walletAddress"
            placeholder="Endereco da carteira"
            required={false}
            defaultValue={investment?.walletAddress ?? ""}
          />
        </>
      )}

      {(type === "FIXED_INCOME" || type === "EMERGENCY_RESERVE") && (
        <>
          <Input
            name="institution"
            placeholder="Instituição"
            defaultValue={investment?.institution ?? ""}
          />
          <Select
            name="indexer"
            defaultValue={
              investment?.indexer ?? (type === "FIXED_INCOME" ? "CDI" : "CDI")
            }
            options={[
              ["CDI", "CDI"],
              ["IPCA", "IPCA"],
              ["PREFIXED", "Prefixado"],
              ["SELIC", "Selic"],
              ["SAVINGS", "Poupanca"],
            ]}
          />
          <Input
            name="cdiPercent"
            placeholder="% do CDI"
            type="number"
            step="0.01"
            required={false}
            defaultValue={numberDefault(investment?.cdiPercent ?? 100)}
          />
          <Input
            name="annualRate"
            placeholder="Taxa anual %"
            type="number"
            step="0.01"
            required={false}
            defaultValue={numberDefault(investment?.annualRate)}
          />
          <Input
            name="monthlyYieldRate"
            placeholder="Rendimento mensal %"
            type="number"
            step="0.01"
            required={false}
            defaultValue={numberDefault(investment?.monthlyYieldRate)}
          />
          <Input
            name="cdiMonthlyRate"
            placeholder="CDI mensal base %"
            type="number"
            step="0.01"
            required={false}
            defaultValue={numberDefault(investment?.cdiMonthlyRate)}
          />
          <Input
            name="liquidity"
            placeholder={
              type === "EMERGENCY_RESERVE"
                ? "Liquidez (ex: D+0)"
                : "Liquidez (ex: vencimento ou D+1)"
            }
            required={false}
            defaultValue={investment?.liquidity ?? ""}
          />
        </>
      )}

      {type === "FIXED_INCOME" && (
        <Input
          name="maturityDate"
          type="date"
          required={false}
          defaultValue={
            investment?.maturityDate
              ? String(investment.maturityDate).slice(0, 10)
              : ""
          }
        />
      )}

      {type === "OTHER" && (
        <>
          <Input
            name="institution"
            placeholder="Instituição ou local"
            required={false}
            defaultValue={investment?.institution ?? ""}
          />
          <Input
            name="notes"
            placeholder="Descrição do ativo"
            required={false}
            defaultValue={investment?.notes ?? ""}
          />
          <Input
            name="monthlyYieldRate"
            placeholder="Rendimento mensal %"
            type="number"
            step="0.01"
            required={false}
            defaultValue={numberDefault(investment?.monthlyYieldRate)}
          />
        </>
      )}
    </div>
  );
}

export function InvestmentDetails({ investment }: { investment: Investment }) {
  const details = [
    investment.ticker ? `Ticker: ${investment.ticker}` : null,
    investment.quantity
      ? `Qtd: ${Number(investment.quantity).toLocaleString("pt-BR")}`
      : null,
    investment.averagePrice
      ? `Preco medio: ${money(investment.averagePrice)}`
      : null,
    investment.broker ? `Corretora: ${investment.broker}` : null,
    investment.institution ? `Instituição: ${investment.institution}` : null,
    investment.indexer ? `Indexador: ${investment.indexer}` : null,
    investment.annualRate
      ? `Taxa anual: ${Number(investment.annualRate).toFixed(2)}%`
      : null,
    investment.maturityDate
      ? `Vence em: ${dateLabel(investment.maturityDate)}`
      : null,
    investment.liquidity ? `Liquidez: ${investment.liquidity}` : null,
    investment.custodyLocation
      ? `Custodia: ${investment.custodyLocation}`
      : null,
  ].filter(Boolean);

  if (!details.length) return null;

  return (
    <p className="mt-2 text-xs leading-5 text-slate-500">
      {details.join(" - ")}
    </p>
  );
}
