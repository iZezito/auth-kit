# Auth Kit

Monorepo com solução completa de autenticação, composto por uma API REST e uma aplicação web. Serve como base para projetos que precisam de um sistema de auth robusto pronto para uso.

## Estrutura

```
apps/
  server/   # API (Bun + Elysia.js)
  web/      # Frontend (React + Vite)
```

## Funcionalidades

- Cadastro e login com email/senha
- Verificação de email
- Recuperação de senha via email
- Autenticação em dois fatores (2FA) por código OTP
- Login social com Google (OAuth2 + PKCE)
- Sessões via JWT em cookie HttpOnly
- Cache de sessão com Redis

## Stack

**Backend**
- [Bun](https://bun.sh/) — runtime e gerenciador de pacotes
- [Elysia.js](https://elysiajs.com/) — framework HTTP
- [Drizzle ORM](https://orm.drizzle.team/) + PostgreSQL — banco de dados
- [Redis](https://redis.io/) — cache de sessão
- [Arctic](https://arcticjs.dev/) — OAuth2
- [React Email](https://react.email/) + Nodemailer — emails transacionais

**Frontend**
- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query) — gerenciamento de estado assíncrono
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) — formulários e validação

## Como rodar

Instale as dependências na raiz do monorepo:

```sh
bun install
```

Suba todos os serviços em modo de desenvolvimento:

```sh
bun run dev
```

Ou rode cada app individualmente:

```sh
bun run dev --filter=server
bun run dev --filter=web
```

> O servidor sobe por padrão em `http://localhost:3000` e o frontend em `http://localhost:5173`.

## Variáveis de ambiente

Copie os arquivos de exemplo e preencha os valores:

**`apps/server`**

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão do PostgreSQL |
| `REDIS_URL` | URL de conexão do Redis |
| `JWT_SECRET` | Chave secreta para assinar os tokens JWT |
| `CLIENT_URL` | URL do frontend |
| `GOOGLE_CLIENT_ID` | Client ID do Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google OAuth |
| `MAIL_*` | Configurações do servidor de email (host, porta, usuário, senha) |
