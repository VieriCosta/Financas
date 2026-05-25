# Financas Pessoais

Aplicativo privado de gestao financeira pessoal com React, Vite, Node.js, Express, Prisma e PostgreSQL.

## Rodar Localmente

1. Instale dependencias:

```bash
npm.cmd install
```

2. Suba o PostgreSQL local:

```bash
docker compose up -d postgres
```

3. Configure `backend/.env`:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/financas"
JWT_SECRET="troque-por-um-segredo-local-com-mais-de-32-caracteres"
JWT_EXPIRES_IN="7d"
PORT=3333
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.73:5173"
APP_URL="http://192.168.1.73:5173"
```

4. Rode migrations e gere Prisma Client:

```bash
npm.cmd run prisma:migrate -w backend
npm.cmd run prisma:generate -w backend
```

5. Inicie backend:

```bash
npm.cmd run dev -w backend
```

6. Inicie frontend:

```bash
npm.cmd run start:frontend
```

URLs:

```text
Frontend localhost: http://localhost:5173
Frontend rede local: http://192.168.1.73:5173
Backend localhost: http://localhost:3333
Backend rede local: http://192.168.1.73:3333
Swagger: http://localhost:3333/api/docs
```

## CORS e API

O backend usa `CORS_ORIGINS` com multiplas origens separadas por virgula.

Exemplo local:

```text
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.73:5173"
```

O frontend usa `VITE_API_URL` se ela existir. Se estiver vazia, ele detecta automaticamente o host da pagina:

- Abrindo `http://localhost:5173`, chama `http://localhost:3333/api`
- Abrindo `http://192.168.1.73:5173`, chama `http://192.168.1.73:3333/api`

## Usuario Demo

```bash
npm.cmd run seed:demo -w backend
```

```text
E-mail: teste@gmail.com
Senha: teste123
```

## Recuperacao de Senha

Configure SMTP no `backend/.env`:

```text
APP_URL="http://192.168.1.73:5173"
SMTP_HOST="smtp.seuprovedor.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="usuario"
SMTP_PASS="senha-ou-app-password"
SMTP_FROM="Financas Pessoais <no-reply@seudominio.com>"
```

Sem SMTP, o backend imprime o link no console para teste local.

## Deploy Gratuito

### Banco PostgreSQL Neon

1. Crie conta em https://neon.tech
2. Crie um projeto PostgreSQL gratuito.
3. Copie a connection string com `sslmode=require`.
4. Use essa string em `DATABASE_URL` no Render.

### Backend Render

1. Suba o projeto para GitHub.
2. No Render, crie um Web Service.
3. Root directory: `backend`.
4. Build command:

```bash
npm install --production=false && npx prisma generate && npm run build && npx prisma migrate deploy
```

5. Start command:

```bash
npm run start
```

6. Variaveis no Render:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
JWT_SECRET=gere-um-segredo-unico-com-mais-de-32-caracteres
JWT_EXPIRES_IN=7d
PORT=10000
CORS_ORIGINS=https://seu-frontend.vercel.app
APP_URL=https://seu-frontend.vercel.app
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Financas Pessoais <no-reply@seudominio.com>
```

### Frontend Vercel

1. Importe o repositorio na Vercel.
2. Root directory: `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Variavel:

```text
VITE_API_URL=https://sua-api.onrender.com/api
```

6. Depois do deploy do frontend, volte no Render e ajuste:

```text
CORS_ORIGINS=https://seu-frontend.vercel.app
APP_URL=https://seu-frontend.vercel.app
```

Se usar preview deployments da Vercel, voce pode usar wildcard:

```text
CORS_ORIGINS=https://seu-frontend.vercel.app,https://*.vercel.app
```
