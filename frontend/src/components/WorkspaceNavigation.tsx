import { useEffect, useState } from "react";
import {
  BrainCircuit,
  CalendarClock,
  ChevronDown,
  CreditCard,
  Download,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";

export type ViewKey =
  | "overview"
  | "transactions"
  | "agenda"
  | "planning"
  | "insights"
  | "investments"
  | "goals"
  | "ai"
  | "profile"
  | "accounts"
  | "cards"
  | "import"
  | "reports"
  | "backup"
  | "settings";
const sectors = [
  {
    key: "daily",
    label: "Dia a dia",
    description: "Movimentações e contas",
    items: [
      { key: "transactions", label: "Movimentações", icon: ReceiptText },
      { key: "accounts", label: "Contas e carteiras", icon: WalletCards },
      { key: "cards", label: "Cartões e faturas", icon: CreditCard },
      { key: "agenda", label: "Agenda", icon: CalendarClock },
      { key: "import", label: "Importar extrato", icon: Download },
    ],
  },
  {
    key: "planning",
    label: "Planejamento",
    description: "Objetivos e patrimônio",
    items: [
      { key: "planning", label: "Planejamento", icon: PiggyBank },
      { key: "goals", label: "Metas", icon: Target },
      { key: "investments", label: "Investimentos", icon: TrendingUp },
    ],
  },
  {
    key: "analysis",
    label: "Análises",
    description: "Resultados e orientação",
    items: [
      { key: "reports", label: "Relatórios", icon: TrendingUp },
      { key: "insights", label: "Insights", icon: SlidersHorizontal },
      { key: "ai", label: "Conselho de IA", icon: BrainCircuit },
    ],
  },
  {
    key: "organization",
    label: "Organização",
    description: "Preferências e seus dados",
    items: [
      { key: "settings", label: "Categorias e tags", icon: SlidersHorizontal },
      { key: "backup", label: "Backup dos dados", icon: ShieldCheck },
      { key: "profile", label: "Meu perfil", icon: UserRound },
    ],
  },
] as const;

export function WorkspaceNavigation({
  activeView,
  onNavigate,
  mobile = false,
}: {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  mobile?: boolean;
}) {
  const activeSector = sectors.find((sector) =>
    sector.items.some((item) => item.key === activeView),
  );
  const [openSector, setOpenSector] = useState<string | null>(
    activeSector?.key ?? null,
  );
  useEffect(() => {
    setOpenSector(activeSector?.key ?? null);
  }, [activeSector?.key]);
  const selected = sectors.find((sector) => sector.key === openSector);
  const itemClass = (key: ViewKey) =>
    mobile
      ? `flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${activeView === key ? "mobile-nav-active" : "mobile-nav-idle"}`
      : `nav-item flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${activeView === key ? "nav-item-active" : "nav-item-idle"}`;

  if (mobile)
    return (
      <nav
        className="mobile-nav mt-4 grid gap-2 lg:hidden"
        aria-label="Navegação por setores"
      >
        <div className="sector-scroll flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className={`sector-tab ${!openSector ? "sector-tab-selected" : ""}`}
            aria-pressed={!openSector}
            aria-label="Setor: Visão geral"
            onClick={() => {
              setOpenSector(null);
              onNavigate("overview");
            }}
          >
            Visão geral
          </button>
          {sectors.map((sector) => (
            <button
              type="button"
              key={sector.key}
              className={`sector-tab ${openSector === sector.key ? "sector-tab-selected" : ""}`}
              aria-pressed={openSector === sector.key}
              aria-label={`Setor: ${sector.label}`}
              onClick={() => setOpenSector(sector.key)}
            >
              {sector.label}
            </button>
          ))}
        </div>
        <div
          className="sector-scroll flex gap-2 overflow-x-auto"
          aria-label={selected?.label ?? "Visão geral"}
        >
          {selected ? (
            selected.items.map((item) => (
              <button
                type="button"
                key={item.key}
                aria-current={activeView === item.key ? "page" : undefined}
                className={itemClass(item.key)}
                onClick={() => onNavigate(item.key)}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))
          ) : (
            <button
              type="button"
              className={itemClass("overview")}
              aria-current={activeView === "overview" ? "page" : undefined}
              onClick={() => onNavigate("overview")}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
          )}
        </div>
      </nav>
    );

  return (
    <nav className="grid gap-2 px-3 pb-5" aria-label="Navegação principal">
      <button
        type="button"
        className={itemClass("overview")}
        aria-current={activeView === "overview" ? "page" : undefined}
        onClick={() => onNavigate("overview")}
      >
        <LayoutDashboard size={20} />
        Dashboard
      </button>
      <p className="sector-caption px-3 pt-4">SETORES</p>
      {sectors.map((sector) => (
        <div
          className={`sector-group ${activeSector?.key === sector.key ? "sector-group-current" : ""}`}
          key={sector.key}
        >
          <button
            type="button"
            className="sector-heading"
            aria-label={`Setor: ${sector.label}`}
            aria-expanded={openSector === sector.key}
            aria-controls={`sector-${sector.key}`}
            onClick={() =>
              setOpenSector(openSector === sector.key ? null : sector.key)
            }
          >
            <span>
              <strong>{sector.label}</strong>
              <small>{sector.description}</small>
            </span>
            <ChevronDown
              size={16}
              className={openSector === sector.key ? "rotate-180" : ""}
            />
          </button>
          {openSector === sector.key && (
            <div id={`sector-${sector.key}`} className="grid gap-1 px-2 pb-2">
              {sector.items.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={itemClass(item.key)}
                  aria-current={activeView === item.key ? "page" : undefined}
                  onClick={() => onNavigate(item.key)}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
