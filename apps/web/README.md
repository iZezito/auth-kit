# Auth Kit Web

Frontend oficial do Auth Kit, construído com React 19, Vite, TypeScript,
TanStack Router, TanStack Form, TanStack Query, Eden Treaty, Tailwind CSS e
shadcn/Base UI.

## Desenvolvimento

Instale as dependências na raiz do monorepo e inicie o app:

```sh
bun install
bun run --cwd apps/web dev
```

O frontend usa `http://localhost:5173` por padrão. Configure a API em um arquivo
`.env` local:

```sh
VITE_BASE_URL=http://localhost:3000
```

## Rotas

As rotas file-based são organizadas por layouts pathless:

- `src/routes/_guest`: páginas exclusivas para visitantes.
- `src/routes/_authenticated`: páginas que exigem uma sessão válida.
- `src/routes/_authenticated/_admin`: páginas que também exigem a role
  `ADMIN`.

Cada diretório usa `route.tsx` como layout e mantém suas páginas em arquivos
separados. Novas rotas administrativas devem ser criadas dentro de `_admin`.

## Verificações

```sh
bun run --cwd apps/web lint
bun run --cwd apps/web check-types
bun run --cwd apps/web test
bun run --cwd apps/web build
```

## Container

A imagem deve ser construída usando a raiz do monorepo como contexto:

```sh
docker compose -f apps/web/docker-compose.yml up --build
```
