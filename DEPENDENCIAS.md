# Revisao de seguranca das dependencias

## Resultado

A auditoria inicial apontava 12 alertas: 8 altos, 3 moderados e 1 baixo. As correcoes abaixo eliminam os alertas conhecidos, incluindo dependencias de desenvolvimento. A verificacao se refere a base de avisos consultada nesta revisao; nao e uma garantia sobre vulnerabilidades desconhecidas ou publicadas posteriormente.

## Alteracoes

| Origem | Correcao |
| --- | --- |
| Tailwind 3: braces, micromatch, chokidar e plugins PostCSS antigos | Tailwind 4.3.3 com plugin oficial para Vite; removidos o plugin PostCSS antigo e autoprefixer. |
| Express: qs 6.14.2 | Express 4.22.3 passa a usar qs 6.16.0. |
| tsx: esbuild 0.27.7 | tsx 4.23.15 usa esbuild 0.28.2. |
| Prisma config: deepmerge-ts 7.1.5 | Override exato de deepmerge-ts 8.0.2, mantendo Prisma e Prisma Client 6.19.3. |

A migracao do Tailwind preserva a paleta utilizada, os tamanhos de utilitarios pequenos, as sombras personalizadas, o modo escuro por classe e a aparencia basica de bordas e placeholders. As configuracoes foram concentradas no CSS e no Vite.

O Prisma tambem foi declarado como ferramenta da raiz, na mesma versao utilizada pelo backend, para que o npm reconheca corretamente a resolucao transitiva do override ao atravessar os workspaces. O backend conserva sua dependencia de desenvolvimento para os comandos de deploy existentes. Nao foram alteradas tabelas nem migracoes de banco.

## Verificar e manter

Validacao desta revisao: instalacao limpa com `npm ci`, geracao do Prisma Client, nove migracoes em dia, lint e builds aprovados, 22 testes de backend e quatro testes de interface aprovados. As auditorias completa e de producao terminaram com zero vulnerabilidades conhecidas.

```powershell
npm.cmd ci
npm.cmd run prisma:generate -w backend
npm.cmd run audit:security
npm.cmd audit --omit=dev
npm.cmd run check
```

Execute tambem os testes de integracao e interface com `TEST_DATABASE_URL` configurado conforme [OPERACAO.md](OPERACAO.md). O CI verifica a auditoria alem dos builds e testes. Prefira `npm ci` para reproduzir o lockfile e rode novamente a auditoria depois de atualizar pacotes.

O Tailwind 4 requer navegadores modernos: Chrome 111+, Safari 16.4+ e Firefox 128+. Os testes de interface cobrem desktop e celular em Chromium.

## Fontes

- [Guia oficial de migracao do Tailwind 4](https://tailwindcss.com/docs/upgrade-guide).
- [Correcao de seguranca e compatibilidade do deepmerge-ts 8](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0).
- [Documentacao oficial de overrides do npm](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides).
- [Problema do npm com overrides em workspaces](https://github.com/npm/cli/issues/9514).
