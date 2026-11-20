# AGENTS.md

## Projeto
API em JavaScript ESM (Node 22+), Fastify 5, Prisma 7 e MariaDB. Sem TypeScript.
Arquitetura em camadas: rotas → controllers → services → repositories. Dependências montadas em `src/container.js`.

## Fluxo de trabalho
- Uma branch por tarefa, a partir do `main` atualizado: `feat/`, `fix/`, `chore/`, `refactor/`, `test/`, `docs/`.
- Commits no formato `tipo: descrição` em inglês, curtos.
- Não faça `git push` nem abra PR: eu faço. Entregue o commit e a descrição do PR em Markdown.
- Não suba o servidor nem o banco sem eu pedir.
- Antes de commitar rode: `npm run check && npm run lint && npm test`.

## Estilo de código
- Simples e direto. Prefira reutilizar o padrão que já existe (ex.: `TutorialService`, `CrudService`) a criar abstrações novas.
- Não adicione comentários que apenas descrevem o código. Comente só o "porquê" de decisões não óbvias, e em poucas linhas.
- Sem código "esperto": nada de one-liners difíceis de ler, metaprogramação ou helpers genéricos para um único uso.
- Mudanças pequenas e focadas: não refatore o que não faz parte da tarefa.
- Mensagens de erro e respostas da API em português, como no restante do projeto.

## Segurança
- Nunca confie em dados do JWT para autorização de escola; leia do banco.
- Validação de entrada sempre com Zod nos controllers.
- Nunca versione `.env` nem registre senhas, tokens ou links de redefinição em logs.

## Testes
- Toda correção ou funcionalidade nova vem com teste em `test/`.
- Testes HTTP usam `MemoryDatabase`; integração real fica em `test/database.integration.js`.

## Antes de agir
- Se o pedido for ambíguo ou mudar o contrato da API, pergunte antes.
- Diga explicitamente quando uma decisão minha mudar comportamento existente.
