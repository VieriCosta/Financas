# Operacao e validacao

## Atualizar uma instalacao existente

Antes de atualizar, exporte o backup JSON na aplicacao e faca um backup do PostgreSQL. Configure `DATABASE_URL` para o banco pretendido e execute:

```powershell
npm.cmd ci
npm.cmd run prisma:generate -w backend
npm.cmd run prisma:deploy -w backend
npm.cmd run check
```

A migracao `20261013120000_complete_finance` adiciona contas, transferencias, cartoes, pagamentos, conciliacao e arquivamento. Ela preserva registros existentes; movimentacoes antigas continuam sem conta vinculada e podem receber uma conta pela edicao do historico.

O saldo disponivel considera saldo inicial, receitas e despesas fora do cartao, contas pagas e pagamentos de fatura. Investimentos aparecem separadamente. Compras no cartao entram nas despesas uma vez; pagamentos entram no fluxo de caixa. Transferencias preservam o saldo total.

Datas de lancamentos usam o dia informado em UTC para evitar que uma movimentacao de dia 1 apareca no ultimo dia do mes anterior. Datas de pagamento de contas novas ficam registradas em `paidAt`; contas antigas pagas sem esse campo usam o vencimento como referencia historica.

## Backup do usuario

Em **Backup dos dados**, baixe o JSON. Ele contem os registros financeiros, relacionamentos e comprovantes; nao inclui senhas, sessoes, tokens, propostas pendentes de IA ou logs de seguranca.

A restauracao exige uma conta sem registros financeiros. Categorias e tags existentes compativeis sao reaproveitadas. IDs sao recriados e todas as relacoes sao remapeadas para o usuario conectado. Uma falha desfaz a restauracao inteira. O arquivo deve ter ate 30 MB.

## Backup e restauracao do PostgreSQL

Use `pg_dump` da mesma versao principal do servidor ou uma versao compativel. O exemplo assume PostgreSQL local na porta 5433:

```powershell
pg_dump --host=localhost --port=5433 --username=postgres --dbname=financas --format=custom --file=financas-backup.dump
```

Teste a recuperacao em um banco novo antes de substituir qualquer ambiente:

```powershell
createdb --host=localhost --port=5433 --username=postgres financas_restore
pg_restore --host=localhost --port=5433 --username=postgres --dbname=financas_restore --no-owner --exit-on-error financas-backup.dump
```

Configure uma instancia de desenvolvimento com `DATABASE_URL` apontando para `financas_restore`, verifique o login e compare saldos e quantidade de registros com o ambiente de origem. Guarde dumps e JSON em local privado; eles contêm dados financeiros.

## Verificacoes locais

`npm.cmd run check` executa lint, builds e testes unitarios. Testes de integracao so executam quando `TEST_DATABASE_URL` esta definido e corresponde a `DATABASE_URL`.

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5433/financas_test'
$env:TEST_DATABASE_URL=$env:DATABASE_URL
$env:NODE_ENV='test'
$env:JWT_SECRET='segredo-exclusivo-de-testes-com-mais-de-32-caracteres'
npm.cmd run prisma:deploy -w backend
npm.cmd run check
npm.cmd run test:e2e
```

Crie `financas_test` previamente. Nunca aponte esses comandos para producao. Os testes de interface criam usuarios e registros de exemplo nesse banco isolado.

Os testes de interface usam Chrome instalado localmente. No CI, Playwright instala Chromium e executa os fluxos em desktop e celular. Backend e frontend de teste usam as portas 3358 e 5178, e o backend de teste nao inicia tarefas de e-mail.

## Limites atuais

- Restauracao JSON ocorre em conta vazia; mesclar backups com dados existentes exige conciliacao manual.
- Cartoes com compras registradas mantem suas datas de fechamento e vencimento. Para mudar essas datas, arquive o cartao e crie outro.
- Compras no dia do fechamento entram na proxima fatura. Parcelas ficam em movimentacoes e nas faturas correspondentes.
- Importacao aceita CSV e OFX com ate 2 MB e 2000 lancamentos, com previa e escolha de categorias. Arquivos fora desses limites devem ser divididos.
- SMTP e chamadas reais ao provedor de IA dependem das credenciais do ambiente. Os testes validam autenticacao e confirmacao de comandos sem chamar servicos externos.
- A auditoria de dependencias ainda aponta alertas transitivos, incluindo ferramentas de desenvolvimento. Atualizacoes compativeis foram aplicadas; migracoes de versao principal dessas ferramentas exigem uma revisao propria. O parser de consultas da API usa o modo simples do Express.
