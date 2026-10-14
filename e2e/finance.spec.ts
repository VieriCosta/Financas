import { test, expect, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function register(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Cadastre-se/ }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Teste Navegador");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(`browser-${randomUUID()}@example.test`);
  await page.getByLabel("Senha", { exact: true }).fill("Test-browser-123!");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard financeiro." }),
  ).toBeVisible();
}
async function navigate(page: Page, name: string) {
  const mobile = (page.viewportSize()?.width ?? 1440) < 1024;
  const nav = mobile
    ? page.locator(".mobile-nav")
    : page.getByRole("navigation", { name: "Navegação principal" });
  const sectorFor: Record<string, string> = {
    Movimentações: "Dia a dia",
    "Contas e carteiras": "Dia a dia",
    "Cartões e faturas": "Dia a dia",
    Agenda: "Dia a dia",
    "Importar extrato": "Dia a dia",
    Planejamento: "Planejamento",
    Metas: "Planejamento",
    Investimentos: "Planejamento",
    Relatórios: "Análises",
    Insights: "Análises",
    "Conselho de IA": "Análises",
    "Categorias e tags": "Organização",
    "Backup dos dados": "Organização",
    "Meu perfil": "Organização",
  };
  if (!(await nav.getByRole("button", { name, exact: true }).isVisible())) {
    await nav
      .getByRole("button", {
        name: `Setor: ${sectorFor[name] ?? "Visão geral"}`,
        exact: true,
      })
      .click();
  }
  await nav.getByRole("button", { name, exact: true }).click();
}
test("cadastro, contas, compra parcelada, fatura, relatorio e backup", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await register(page);
  await expect(
    page.getByRole("heading", { name: "Comece seu controle financeiro" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver um exemplo" }).click();
  await expect(
    page.getByText("Exemplo ilustrativo", { exact: true }),
  ).toBeVisible();
  await navigate(page, "Contas e carteiras");
  const accountSection = page.locator("section.surface-card").filter({
    has: page.getByRole("heading", { name: "Nova conta ou carteira" }),
  });
  await accountSection
    .getByLabel("Nome", { exact: true })
    .fill("Banco de teste");
  await accountSection.getByLabel(/Saldo inicial/).fill("1000");
  await accountSection
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Banco de teste", exact: true }),
  ).toBeVisible();
  await navigate(page, "Cartões e faturas");
  const newCard = page.locator("section.surface-card").filter({
    has: page.getByRole("heading", { name: "Novo cartão", exact: true }),
  });
  await newCard.getByLabel("Nome", { exact: true }).fill("Cartão de teste");
  await newCard.getByLabel("Limite", { exact: true }).fill("500");
  await newCard.getByLabel("Dia de fechamento").fill("20");
  await newCard.getByLabel("Dia de vencimento").fill("10");
  await newCard.getByRole("button", { name: "Salvar", exact: true }).click();
  const purchase = page.locator("section.surface-card").filter({
    has: page.getByRole("heading", { name: "Compra no cartão", exact: true }),
  });
  await purchase
    .getByLabel("Descrição", { exact: true })
    .fill("Compra do navegador");
  await purchase.getByLabel("Valor total", { exact: true }).fill("90");
  await purchase.getByLabel("Parcelas", { exact: true }).fill("3");
  await purchase
    .getByLabel("Data da compra", { exact: true })
    .fill("2026-01-10");
  await purchase.getByRole("button", { name: "Registrar compra" }).click();
  await expect(
    page.getByRole("heading", { name: /Fatura 2026-01/ }),
  ).toBeVisible();
  const invoice = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: /Fatura 2026-01/ }) });
  await invoice.getByLabel("Data do pagamento").fill("2026-01-15");
  await invoice.getByRole("button", { name: "Pagar fatura" }).click();
  await expect(invoice.getByText(/pago R\$.*30,00/)).toBeVisible();
  await navigate(page, "Relatórios");
  await page.getByLabel("Data inicial").fill("2026-01-01");
  await page.getByLabel("Data final").fill("2026-03-31");
  await expect(
    page.getByText("3 movimentações nos filtros selecionados."),
  ).toBeVisible();
  await navigate(page, "Backup dos dados");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar backup JSON" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /finan[çc]as-backup.*json/,
  );
  await navigate(page, "Categorias e tags");
  const categories = page.locator("section.surface-card").filter({
    has: page.getByRole("heading", { name: "Nova categoria", exact: true }),
  });
  await categories
    .getByLabel("Nome", { exact: true })
    .fill("Teste de categoria");
  await categories.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText("Teste de categoria", { exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole("status")).not.toBeVisible();
  await page.screenshot({
    path: `.cache/interface-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("importacao CSV revisada concilia sem duplicar e preserva o historico", async ({
  page,
}) => {
  await register(page);
  await navigate(page, "Contas e carteiras");
  const accountSection = page.locator("section.surface-card").filter({
    has: page.getByRole("heading", { name: "Nova conta ou carteira" }),
  });
  await accountSection
    .getByLabel("Nome", { exact: true })
    .fill("Conta do extrato");
  await accountSection
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conta do extrato", exact: true }),
  ).toBeVisible();
  await navigate(page, "Importar extrato");
  await page
    .getByRole("combobox", { name: "Conta do extrato", exact: true })
    .selectOption({ label: "Conta do extrato" });
  const file = {
    name: "extrato.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "data,descricao,valor\n2026-10-01,Mercado de teste,-25.50",
    ),
  };
  await page.getByLabel("Arquivo CSV ou OFX").setInputFiles(file);
  await page.getByRole("button", { name: "Analisar extrato" }).click();
  await expect(
    page.getByText("Revise antes de confirmar", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar 1 registros" }).click();
  await expect(
    page.getByText("1 novas movimentações; 0 existentes conciliadas."),
  ).toBeVisible();
  await page.getByLabel("Arquivo CSV ou OFX").setInputFiles(file);
  await page.getByRole("button", { name: "Analisar extrato" }).click();
  await expect(
    page.getByText(/1 registros.*1 possiveis duplicatas/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar 1 registros" }).click();
  await expect(
    page.getByText("0 novas movimentações; 1 existentes conciliadas."),
  ).toBeVisible();
  await navigate(page, "Movimentações");
  await page
    .getByRole("combobox", { name: "Mês do histórico" })
    .selectOption("10");
  await page.getByRole("spinbutton", { name: "Ano do histórico" }).fill("2026");
  await expect(page.getByText("Mercado de teste", { exact: true })).toHaveCount(
    1,
  );
  await expect(
    page.getByText("Conciliada com o extrato", { exact: true }),
  ).toBeVisible();
});
