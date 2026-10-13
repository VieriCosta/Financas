# Roteiro de melhorias

## Implementado nesta revisao

- Historico e CSV com escolha de mes e ano; todos os meses de um ano ou todo o historico.
- Validacao de periodos e faixas de valor na API.
- Aviso persistente quando parte do painel nao consegue atualizar, com tentativa manual.
- Tratamento de erro na busca e paginacao de movimentacoes.
- Pequeno atraso na busca para reduzir requisicoes durante a digitacao.
- Desenvolvimento com Vite e atualizacao automatica ao editar arquivos.
- Comandos `npm run test` e `npm run check` na raiz.

## Prioridade 1 — Confiabilidade

- Impedir respostas antigas de requisicoes concorrentes de substituir dados recentes.
- Dividir DashboardPage em componentes e hooks por funcionalidade.
- Configurar ESLint 9: os scripts existem, mas falta a configuracao.
- Testar autenticacao, isolamento entre usuarios, recorrencias, parcelas, pagamento de contas e comandos de IA.
- Adicionar verificacoes automaticas de build e testes no CI.
- Validar migracoes em banco vazio e documentar backup e restauracao.
- Uniformizar datas financeiras e fuso horario em toda a aplicacao.

## Prioridade 2 — Gestao financeira completa

- Contas e carteiras com saldo inicial e transferencias sem duplicar receita/despesa.
- Cartoes com fechamento, vencimento, fatura e parcelas vinculadas.
- Importacao CSV/OFX com previa, mapeamento de categorias e deteccao de duplicatas.
- Conciliacao entre extrato e lancamentos.
- Relatorios por periodo com comparacao entre meses e resumo completo dos filtros.
- Exportacao e restauracao de dados do usuario.
- Edicao e arquivamento de categorias, tags e regras recorrentes.

## Prioridade 3 — Experiencia

- Padronizar acentos, textos, estados vazios e mensagens de erro.
- Revisar acessibilidade, foco do teclado, formularios e uso em celular.
- Selecionar periodo no planejamento e no fechamento mensal.
- Substituir elementos decorativos que sugerem evolucao financeira por dados reais ou identificacao clara.
- Onboarding com exemplos opcionais e orientacao para os primeiros lancamentos.

## Criterio para considerar uma etapa concluida

Implementacao revisada, build aprovado, testes pertinentes aprovados e fluxo verificado com banco de desenvolvimento. Publicacao depende de ambiente e configuracao de producao.
