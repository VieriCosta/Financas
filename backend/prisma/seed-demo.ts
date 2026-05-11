import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoEmail = "teste@gmail.com";
const demoPassword = "teste123";

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

function date(day: number, monthOffset = 0) {
  return new Date(currentYear, currentMonth + monthOffset, day);
}

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: "Usuario Teste",
      passwordHash
    },
    create: {
      name: "Usuario Teste",
      email: demoEmail,
      passwordHash
    }
  });

  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.bill.deleteMany({ where: { userId: user.id } });
  await prisma.investment.deleteMany({ where: { userId: user.id } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.category.deleteMany({ where: { userId: user.id } });

  const categories = await Promise.all([
    prisma.category.create({ data: { userId: user.id, name: "Salario", type: "INCOME", color: "#16a34a", icon: "Briefcase" } }),
    prisma.category.create({ data: { userId: user.id, name: "Freelas", type: "INCOME", color: "#0ea5e9", icon: "Laptop" } }),
    prisma.category.create({ data: { userId: user.id, name: "Alimentacao", type: "EXPENSE", color: "#f97316", icon: "Utensils" } }),
    prisma.category.create({ data: { userId: user.id, name: "Transporte", type: "EXPENSE", color: "#6366f1", icon: "Car" } }),
    prisma.category.create({ data: { userId: user.id, name: "Moradia", type: "EXPENSE", color: "#ef4444", icon: "Home" } }),
    prisma.category.create({ data: { userId: user.id, name: "Lazer", type: "EXPENSE", color: "#a855f7", icon: "Gamepad" } }),
    prisma.category.create({ data: { userId: user.id, name: "Saude", type: "EXPENSE", color: "#14b8a6", icon: "HeartPulse" } })
  ]);

  const byName = Object.fromEntries(categories.map((category) => [category.name, category]));

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, description: "Salario mensal", amount: 6200, type: "INCOME", date: date(5), categoryId: byName.Salario.id },
      { userId: user.id, description: "Projeto freelance", amount: 1350, type: "INCOME", date: date(12), categoryId: byName.Freelas.id },
      { userId: user.id, description: "Mercado do mes", amount: 720, type: "EXPENSE", date: date(8), categoryId: byName.Alimentacao.id },
      { userId: user.id, description: "Restaurante", amount: 185, type: "EXPENSE", date: date(15), categoryId: byName.Alimentacao.id },
      { userId: user.id, description: "Uber e onibus", amount: 260, type: "EXPENSE", date: date(18), categoryId: byName.Transporte.id },
      { userId: user.id, description: "Cinema e lazer", amount: 210, type: "EXPENSE", date: date(20), categoryId: byName.Lazer.id },
      { userId: user.id, description: "Farmacia", amount: 96, type: "EXPENSE", date: date(22), categoryId: byName.Saude.id },
      { userId: user.id, description: "Salario mes anterior", amount: 6100, type: "INCOME", date: date(5, -1), categoryId: byName.Salario.id },
      { userId: user.id, description: "Mercado mes anterior", amount: 690, type: "EXPENSE", date: date(9, -1), categoryId: byName.Alimentacao.id },
      { userId: user.id, description: "Transporte mes anterior", amount: 245, type: "EXPENSE", date: date(18, -1), categoryId: byName.Transporte.id }
    ]
  });

  await prisma.bill.createMany({
    data: [
      { userId: user.id, title: "Aluguel", amount: 1800, dueDate: date(10), status: "PAID", isRecurring: true, recurrenceDay: 10 },
      { userId: user.id, title: "Internet", amount: 129.9, dueDate: date(12), status: "PAID", isRecurring: true, recurrenceDay: 12 },
      { userId: user.id, title: "Energia", amount: 245.35, dueDate: date(18), status: "PENDING", isRecurring: true, recurrenceDay: 18 },
      { userId: user.id, title: "Cartao de credito", amount: 980.2, dueDate: date(25), status: "PENDING", isRecurring: true, recurrenceDay: 25 },
      { userId: user.id, title: "Consulta medica", amount: 280, dueDate: date(27), status: "PENDING", isRecurring: false }
    ]
  });

  await prisma.investment.createMany({
    data: [
      {
        userId: user.id,
        name: "Tesouro Selic",
        type: "FIXED_INCOME",
        currentValue: 8500,
        investedAmount: 8000,
        contribution: 500,
        profitability: 6.25,
        monthlyYieldRate: 0,
        cdiMonthlyRate: 2,
        cdiPercent: 100
      },
      {
        userId: user.id,
        name: "CDB 110% CDI",
        type: "FIXED_INCOME",
        currentValue: 4200,
        investedAmount: 4000,
        contribution: 400,
        profitability: 5,
        monthlyYieldRate: 0,
        cdiMonthlyRate: 2,
        cdiPercent: 110
      },
      {
        userId: user.id,
        name: "Reserva de emergencia",
        type: "EMERGENCY_RESERVE",
        currentValue: 6200,
        investedAmount: 6000,
        contribution: 300,
        profitability: 3.33,
        monthlyYieldRate: 1.1,
        cdiMonthlyRate: 0,
        cdiPercent: 100
      },
      {
        userId: user.id,
        name: "Bitcoin",
        type: "CRYPTO",
        currentValue: 1800,
        investedAmount: 1500,
        contribution: 0,
        profitability: 20,
        monthlyYieldRate: 0,
        cdiMonthlyRate: 0,
        cdiPercent: 100
      }
    ]
  });

  await prisma.goal.createMany({
    data: [
      { userId: user.id, title: "Reserva de 6 meses", targetAmount: 24000, currentAmount: 6200, deadline: date(31, 8) },
      { userId: user.id, title: "Viagem de ferias", targetAmount: 7000, currentAmount: 1850, deadline: date(15, 5) },
      { userId: user.id, title: "Notebook novo", targetAmount: 5500, currentAmount: 2100, deadline: date(20, 3) }
    ]
  });

  console.log(`Usuario demo criado: ${demoEmail}`);
  console.log(`Senha: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
