# Robótica Backend

API REST em Node.js + TypeScript para o sistema de Robótica, com autenticação via JWT, validação com Zod e persistência em MySQL/MariaDB usando Prisma ORM.

---

## Tecnologias

- **[Node.js](https://nodejs.org/)** — runtime JavaScript
- **[TypeScript](https://www.typescriptlang.org/)** — superset tipado de JavaScript
- **[Express 5](https://expressjs.com/)** — framework web
- **[Prisma ORM 7](https://www.prisma.io/)** — ORM e migrations
- **[@prisma/adapter-mariadb](https://www.prisma.io/docs/orm/overview/databases/mysql)** — driver para MySQL/MariaDB
- **[Zod](https://zod.dev/)** — validação de schemas
- **[JWT](https://github.com/auth0/node-jsonwebtoken)** — autenticação por token
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** — hashing de senhas
- **[Helmet](https://helmetjs.github.io/)** — segurança via headers HTTP
- **[CORS](https://github.com/expressjs/cors)** — controle de origem cruzada
- **[dotenv](https://github.com/motdotla/dotenv)** — variáveis de ambiente
- **[ESLint](https://eslint.org/) + [Prettier](https://prettier.io/)** — lint e formatação
- **[tsx](https://github.com/privatenumber/tsx)** — execução de TypeScript em dev com hot reload

---

## Pré-requisitos

Antes de começar, você precisa ter instalado:

- **Node.js** (versão 20 ou superior)
- **pnpm ou npm** (gerenciador de pacotes utilizado no projeto — versão 10.33.0)
- **MySQL** ou **MariaDB** rodando localmente (ou acesso a uma instância remota)

Para instalar o pnpm globalmente (caso queira):

```bash
npm install -g pnpm
```

---

## Instalação

1. **Clone o repositório:**

   ```bash
   git clone <url-do-repositorio>
   cd robotica-backend
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

---

## Configuração do `.env`

O projeto utiliza variáveis de ambiente para configurar a conexão com o banco de dados e a porta da aplicação.

1. **Copie o arquivo de exemplo:**

   ```bash
   cp .env.example .env
   ```

2. **Edite o `.env`** preenchendo com as suas credenciais reais:

   ```env
   DATABASE_URL="mysql://user:password@localhost:3306/database_name"
   DATABASE_USER="user"
   DATABASE_PASSWORD="password"
   DATABASE_NAME="database_name"
   DATABASE_HOST="localhost"
   DATABASE_PORT=3306
   PORT=3333
   ```

   | Variável            | Descrição                                                           |
   |---------------------|---------------------------------------------------------------------|
   | `DATABASE_URL`      | URL de conexão completa, usada pelo Prisma para rodar as migrations |
   | `DATABASE_USER`     | Usuário do banco                                                    |
   | `DATABASE_PASSWORD` | Senha do usuário                                                    |
   | `DATABASE_NAME`     | Nome do banco de dados                                              |
   | `DATABASE_HOST`     | Host do banco (ex: `localhost`)                                     |
   | `DATABASE_PORT`     | Porta do banco (padrão MySQL/MariaDB: `3306`)                       |
   | `PORT`              | Porta em que a API irá rodar (padrão: `3333`)                       |

> **Atenção:** o arquivo `.env` **não deve ser commitado**. Ele já está no `.gitignore`.

---

## Configuração do Prisma

O Prisma é responsável por gerar o client tipado e gerenciar as migrations do banco.

### 1. Gerar o Prisma Client

Sempre que o `prisma/schema.prisma` for alterado, é necessário regenerar o client:

```bash
npx prisma generate
```

O client é gerado em `src/generated/prisma` (configurado no `schema.prisma`) e importado pela aplicação em `src/lib/prisma.ts`.

### 2. Rodar as migrations

Para criar/aplicar as migrations no seu banco local:

```bash
npx prisma migrate dev
```

Esse comando:

- Cria uma migration caso o schema tenha mudado
- Aplica a migration no banco apontado por `DATABASE_URL`
- Regenera o Prisma Client automaticamente

### 3. Aplicar migrations em produção

Em ambientes de produção, use:

```bash
npx prisma migrate deploy
```

### 4. (Opcional) Visualizar os dados

Para abrir a interface gráfica do Prisma e inspecionar o banco:

```bash
npx prisma studio
```

---

## Rodando o projeto

### Modo desenvolvimento (com hot reload)

```bash
npm run dev
```

A API ficará disponível em `http://localhost:3333` (ou na porta definida em `PORT`).

### Build de produção

```bash
npm run build
```

Isso compila o TypeScript para JavaScript em `dist/`.

### Modo produção

```bash
npm run start
```

---

## Scripts disponíveis

| Script             | Descrição                                                |
|--------------------|----------------------------------------------------------|
| `npm run dev`      | Roda o servidor em modo dev com hot reload (`tsx watch`) |
| `npm run build`    | Compila o TypeScript para `dist/`                        |
| `npm run start`    | Roda o servidor a partir do build (`dist/server.js`)     |
| `npm run lint`     | Executa o ESLint em `src/`                               |
| `npm run lint:fix` | Executa o ESLint corrigindo erros automaticamente        |
| `npm run format`   | Formata o código usando o Prettier                       |

---

## Estrutura do projeto

```
robotica-backend/
├── prisma/
│   ├── migrations/         # Histórico de migrations
│   └── schema.prisma       # Modelos do banco
├── src/
│   ├── controllers/        # Lógica das rotas
│   ├── generated/          # Prisma Client gerado (não commitar)
│   ├── lib/                # Instância do Prisma e utilitários
│   ├── models/             # Tipos/modelos de domínio
│   ├── routes/             # Definição das rotas Express
│   ├── schemas/            # Schemas de validação (Zod)
│   ├── app.ts              # Configuração do Express
│   └── server.ts           # Ponto de entrada (sobe o servidor)
├── .env                    # Variáveis de ambiente (não commitar)
├── .env.example            # Template das variáveis
├── eslint.config.mjs
├── package.json
├── prisma.config.ts        # Configuração do Prisma CLI
└── tsconfig.json
```

---

## Endpoints

| Método | Rota         | Descrição                     |
|--------|--------------|-------------------------------|
| GET    | `/status`    | Health check da API           |
| GET    | `/users`     | Lista todos os usuários       |
| GET    | `/users/:id` | Busca um usuário pelo ID      |
| POST   | `/users`     | Cria um novo usuário          |
| PUT    | `/users/:id` | Atualiza um usuário existente |
| DELETE | `/users/:id` | Remove um usuário             |

---

## Fluxo recomendado para começar do zero

```bash
# 1. Instalar dependências
npm install

# 2. Configurar o .env
cp .env.example .env
# (edite o .env com suas credenciais)

# 3. Gerar o Prisma Client
npx prisma generate

# 4. Aplicar as migrations
npx prisma migrate dev

# 5. Subir a API em modo dev
npm run dev
```

Pronto! A API estará rodando em `http://localhost:3333`.
