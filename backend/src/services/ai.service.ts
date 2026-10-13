import { Prisma } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { billDto, goalDto, investmentDto, transactionDto } from "../dtos/finance.dto.js";
import { AppError } from "../utils/AppError.js";
import { getDashboard } from "./finance.service.js";


const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();
const actionSchema = z.object({
  operation: z.enum(["CREATE", "UPDATE", "DELETE"]),
  resource: z.enum(["TRANSACTION", "BILL", "INVESTMENT", "GOAL"]),
  targetId: nullableString,
  description: nullableString,
  title: nullableString,
  name: nullableString,
  amount: nullableNumber,
  type: nullableString,
  date: nullableString,
  dueDate: nullableString,
  deadline: nullableString,
  categoryId: nullableString,
  notes: nullableString,
  status: nullableString,
  isRecurring: z.boolean().nullable(),
  recurrenceDay: nullableNumber,
  currentValue: nullableNumber,
  investedAmount: nullableNumber,
  contribution: nullableNumber,
  profitability: nullableNumber,
  targetAmount: nullableNumber,
  currentAmount: nullableNumber
});
type AiAction = z.infer<typeof actionSchema>;

const previewSchema = z.object({
  ready: z.boolean(),
  summary: z.string(),
  clarification: nullableString,
  actions: z.array(actionSchema).max(10)
});
type ConfirmationPayload = { sub: string; purpose: "ai-command"; historyId: string; actions: AiAction[] };


export async function askFinancialAdvice(userId: string, message: string) {
  const context = await getFinancialContext(userId);
  const response = await callOpenAiText([
    { role: "system", content: "Voce e um assistente de financas pessoais. Responda em portugues do Brasil, de forma objetiva e educativa. Use somente os dados fornecidos. Nao invente valores. Nao execute operacoes." },
    { role: "user", content: `Contexto financeiro:\n${JSON.stringify(context)}\n\nPergunta:\n${message}` }
  ]);
  await saveHistory(userId, "ADVICE", "ANSWERED", message, response);
  return response;
}

export async function generateMonthlyReport(userId: string) {
  const context = await getFinancialContext(userId);
  const response = await callOpenAiText([
    { role: "system", content: "Gere um relatorio mensal em portugues do Brasil. Seja objetivo. Inclua resumo, alertas, oportunidades de economia e tres proximas acoes. Use somente os dados recebidos e nao invente valores." },
    { role: "user", content: JSON.stringify(context) }
  ]);
  await saveHistory(userId, "REPORT", "ANSWERED", "Relatorio mensal", response);
  return response;
}

export async function listAiHistory(userId: string) {
  return prisma.aiHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 });
}

export async function previewFinancialCommand(userId: string, message: string) {
  const context = await getCommandContext(userId);
  const today = new Date().toISOString().slice(0, 10);
  const preview = previewSchema.parse(await callOpenAiStructured([
    {
      role: "system",
      content: [
        "Converta o pedido em ate 10 operacoes financeiras.",
        "Operacoes permitidas: CREATE, UPDATE e DELETE. Recursos: TRANSACTION, BILL, INVESTMENT e GOAL.",
        "Em UPDATE ou DELETE use targetId somente entre os registros fornecidos. Nunca invente IDs.",
        "Nao invente valor, titulo ou data obrigatoria. Se faltar algo retorne ready=false, actions=[] e uma pergunta curta.",
        `Considere hoje como ${today}. Retorne datas em YYYY-MM-DD.`,
        "Preencha campos nao aplicaveis com null. Escolha categoryId somente entre as categorias fornecidas e compativeis."
      ].join(" ")
    },
    { role: "user", content: `Dados disponiveis:\n${JSON.stringify(context)}\n\nPedido:\n${message}` }
  ], commandPreviewJsonSchema));

  if (!preview.ready || !preview.actions.length) {
    await saveHistory(userId, "COMMAND", "PENDING", message, preview.summary);
    return { ...preview, confirmationToken: null };
  }

  await Promise.all(preview.actions.map((action) => validateActionForUser(userId, action)));
  preview.actions.forEach(validateActionPayload);
  const history = await prisma.aiHistory.create({
    data: { userId, kind: "COMMAND", status: "PENDING", request: message, response: preview.summary, actionJson: preview.actions }
  });
  const confirmationToken = jwt.sign(
    { sub: userId, purpose: "ai-command", historyId: history.id, actions: preview.actions },
    env.JWT_SECRET,
    { expiresIn: "10m" }
  );
  return { ...preview, confirmationToken };
}

export async function confirmFinancialCommand(userId: string, confirmationToken: string) {
  let payload: ConfirmationPayload;
  try {
    payload = jwt.verify(confirmationToken, env.JWT_SECRET) as ConfirmationPayload;
  } catch {
    throw new AppError("Confirmacao expirada ou invalida. Gere uma nova proposta.", 400);
  }
  if (payload.sub !== userId || payload.purpose !== "ai-command") throw new AppError("Confirmacao invalida para este usuario.", 403);
  const actions = z.array(actionSchema).min(1).max(10).parse(payload.actions);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "AiHistory" WHERE id = ${payload.historyId} AND "userId" = ${userId} FOR UPDATE`;
    const history = await tx.aiHistory.findFirst({ where: { id: payload.historyId, userId, status: "PENDING", kind: "COMMAND" } });
    if (!history || !isDeepStrictEqual(history.actionJson, actions)) throw new AppError("Proposta invalida ou ja confirmada.", 409);
    for (const action of actions) { await validateActionForUser(userId, action, tx); validateActionPayload(action); }
    const results = [];
    for (const action of actions) {
      results.push(await executeAction(userId, action, tx));
      await tx.auditLog.create({ data: { userId, action: `AI_${action.operation}`, resource: action.resource, resourceId: action.targetId ?? undefined } });
    }
    await tx.aiHistory.update({ where: { id: history.id }, data: { status: "CONFIRMED" } });
    return { count: results.length, results };
  });
}

async function executeAction(userId: string, action: AiAction, db: Prisma.TransactionClient) {
  if (action.operation === "DELETE") {
    if (!action.targetId) throw new AppError("Registro nao informado para exclusao.", 400);
    if (action.resource === "TRANSACTION") return db.transaction.delete({ where: { id: action.targetId } });
    if (action.resource === "BILL") return db.bill.delete({ where: { id: action.targetId } });
    if (action.resource === "INVESTMENT") return db.investment.delete({ where: { id: action.targetId } });
    return db.goal.delete({ where: { id: action.targetId } });
  }

  const fields = withoutNulls(action);
  if (action.operation === "UPDATE") {
    if (!action.targetId) throw new AppError("Registro nao informado para edicao.", 400);
    if (action.resource === "TRANSACTION") return db.transaction.update({ where: { id: action.targetId }, data: transactionDto.partial().parse(fields) });
    if (action.resource === "BILL") return db.bill.update({ where: { id: action.targetId }, data: { ...billDto.partial().parse(fields), ...(action.status ? { paidAt: action.status === "PAID" ? new Date() : null } : {}) } });
    if (action.resource === "INVESTMENT") return db.investment.update({ where: { id: action.targetId }, data: investmentDto.partial().parse(fields) });
    return db.goal.update({ where: { id: action.targetId }, data: goalDto.partial().parse(fields) });
  }

  if (action.resource === "TRANSACTION") return db.transaction.create({ data: { ...transactionDto.parse(fields), userId } });
  if (action.resource === "BILL") return db.bill.create({ data: { ...billDto.parse(fields), paidAt: action.status === "PAID" ? new Date() : null, userId } });
  if (action.resource === "INVESTMENT") return db.investment.create({ data: { ...investmentDto.parse(fields), userId } });
  return db.goal.create({ data: { ...goalDto.parse(fields), userId } });
}

async function validateActionForUser(userId: string, action: AiAction, db: Prisma.TransactionClient = prisma) {
  if (action.operation !== "CREATE") {
    if (!action.targetId) throw new AppError("A IA nao identificou o registro a alterar.", 400);
    const where = { id: action.targetId, userId };
    const exists = action.resource === "TRANSACTION" ? await db.transaction.findFirst({ where })
      : action.resource === "BILL" ? await db.bill.findFirst({ where })
      : action.resource === "INVESTMENT" ? await db.investment.findFirst({ where })
      : await db.goal.findFirst({ where });
    if (action.resource === "TRANSACTION" && exists && "creditCardId" in exists && exists.creditCardId) throw new AppError("Compras de cartao devem ser gerenciadas na tela de cartoes.", 400);
    if (!exists) throw new AppError("A IA tentou alterar um registro invalido. Gere uma nova proposta.", 400);
  }
  if (action.resource === "TRANSACTION" && action.categoryId) {
    const currentTransaction = action.operation === "CREATE" || !action.targetId
      ? null
      : await db.transaction.findFirst({ where: { id: action.targetId, userId }, select: { type: true } });
    const category = await db.category.findFirst({ where: { id: action.categoryId, userId, archived: false } });
    const transactionType = action.type ?? currentTransaction?.type;
    if (!category || (category.type && category.type !== transactionType)) throw new AppError("A IA selecionou uma categoria invalida.", 400);
  }
}

function validateActionPayload(action: AiAction) {
  if (action.operation === "DELETE") return;
  const fields = withoutNulls(action);
  if (action.resource === "TRANSACTION") return action.operation === "CREATE" ? transactionDto.parse(fields) : transactionDto.partial().parse(fields);
  if (action.resource === "BILL") return action.operation === "CREATE" ? billDto.parse(fields) : billDto.partial().parse(fields);
  if (action.resource === "INVESTMENT") return action.operation === "CREATE" ? investmentDto.parse(fields) : investmentDto.partial().parse(fields);
  return action.operation === "CREATE" ? goalDto.parse(fields) : goalDto.partial().parse(fields);
}

async function getFinancialContext(userId: string) {
  const dashboard = await getDashboard(userId);
  return {
    cards: dashboard.cards,
    projection: dashboard.projection,
    bills: dashboard.bills.map((item) => ({ title: item.title, amount: Number(item.amount), status: item.status, dueDate: item.dueDate })),
    goals: dashboard.goals.map((item) => ({ title: item.title, targetAmount: Number(item.targetAmount), currentAmount: Number(item.currentAmount) })),
    investments: dashboard.investmentsList.map((item) => ({ name: item.name, type: item.type, currentValue: Number(item.currentValue) })),
    recentTransactions: dashboard.recentTransactions.map((item) => ({ description: item.description, amount: Number(item.amount), type: item.type, date: item.date }))
  };
}

async function getCommandContext(userId: string) {
  const [categories, transactions, bills, investments, goals] = await Promise.all([
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true, type: true } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 30, select: { id: true, description: true, amount: true, type: true, date: true } }),
    prisma.bill.findMany({ where: { userId }, orderBy: { dueDate: "desc" }, take: 30, select: { id: true, title: true, amount: true, status: true, dueDate: true } }),
    prisma.investment.findMany({ where: { userId }, select: { id: true, name: true, currentValue: true } }),
    prisma.goal.findMany({ where: { userId }, select: { id: true, title: true, targetAmount: true, currentAmount: true } })
  ]);
  return { categories, transactions, bills, investments, goals };
}

function withoutNulls(action: AiAction) {
  return Object.fromEntries(Object.entries(action).filter(([key, value]) => !["operation", "resource", "targetId"].includes(key) && value !== null));
}

async function saveHistory(userId: string, kind: "ADVICE" | "COMMAND" | "REPORT", status: "ANSWERED" | "PENDING", request: string, response: string) {
  return prisma.aiHistory.create({ data: { userId, kind, status, request, response } });
}

async function callOpenAiText(input: Array<{ role: "system" | "user"; content: string }>) {
  return extractOutputText(await callOpenAi({ model: env.OPENAI_MODEL, input }));
}
async function callOpenAiStructured(input: Array<{ role: "system" | "user"; content: string }>, schema: Record<string, unknown>) {
  return JSON.parse(extractOutputText(await callOpenAi({ model: env.OPENAI_MODEL, input, text: { format: { type: "json_schema", name: "financial_command_preview", strict: true, schema } } })));
}
async function callOpenAi(body: Record<string, unknown>) {
  if (!env.OPENAI_API_KEY) throw new AppError("IA ainda nao configurada. Defina OPENAI_API_KEY no backend.", 503);
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw await getOpenAiError(response);
  return response.json() as Promise<{ output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }>;
}

async function getOpenAiError(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: { code?: string } } | null;
  const code = payload?.error?.code;

  if (response.status === 429 && code === "insufficient_quota") {
    return new AppError("A conta da API da OpenAI esta sem saldo. Adicione creditos no painel de cobranca da API.", 503);
  }
  if (response.status === 429) {
    return new AppError("Muitas consultas de IA em pouco tempo. Aguarde alguns segundos e tente novamente.", 503);
  }
  if (response.status === 401) {
    return new AppError("A chave da API da OpenAI e invalida ou foi revogada.", 503);
  }
  if (response.status === 403) {
    return new AppError("A chave da OpenAI nao possui permissao para usar Responses API.", 503);
  }
  if (response.status === 404) {
    return new AppError("O modelo de IA configurado nao esta disponivel para esta conta.", 503);
  }

  return new AppError("Nao foi possivel consultar a IA agora.", 502);
}
function extractOutputText(response: { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  const text = response.output?.flatMap((item) => item.content ?? []).find((content) => content.type === "output_text")?.text;
  if (!text) throw new AppError("A IA nao retornou uma resposta utilizavel.", 502);
  return text;
}

const nullableText = { type: ["string", "null"] };
const nullableValue = { type: ["number", "null"] };
const actionProperties = {
  operation: { enum: ["CREATE", "UPDATE", "DELETE"] }, resource: { enum: ["TRANSACTION", "BILL", "INVESTMENT", "GOAL"] },
  targetId: nullableText, description: nullableText, title: nullableText, name: nullableText, amount: nullableValue,
  type: nullableText, date: nullableText, dueDate: nullableText, deadline: nullableText, categoryId: nullableText, notes: nullableText,
  status: nullableText, isRecurring: { type: ["boolean", "null"] }, recurrenceDay: nullableValue, currentValue: nullableValue,
  investedAmount: nullableValue, contribution: nullableValue, profitability: nullableValue, targetAmount: nullableValue, currentAmount: nullableValue
};
const commandPreviewJsonSchema = {
  type: "object",
  properties: {
    ready: { type: "boolean" }, summary: { type: "string" }, clarification: nullableText,
    actions: { type: "array", maxItems: 10, items: { type: "object", properties: actionProperties, required: Object.keys(actionProperties), additionalProperties: false } }
  },
  required: ["ready", "summary", "clarification", "actions"],
  additionalProperties: false
};
