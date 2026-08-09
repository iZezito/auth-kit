# Regras e Padrões de Codificação

## 1. Regras Gerais

- Linguagem do projeto: **Português (BR)** para textos de UI e mensagens
- Monorepo **Turborepo** com **Bun** (`packageManager: bun@1.3.7`)
- Path alias `@/*` mapeia para `src/*` em ambos os apps
- Nomes de arquivos em **kebab-case** (ex: `content-loader.tsx`, `use-service.ts`)
- Nomes de componentes/classes exportados em **PascalCase**
- TypeScript **strict mode** habilitado em ambos os apps
- **NUNCA** usar `any`. Sempre tipar corretamente com tipos específicos, generics, `unknown` (com narrowing), ou utility types. Isso vale para frontend e backend sem exceção
- Não adicionar comentários no código
- Usar imports com alias `@/` (nunca caminhos relativos com `../`)

---

## 2. Tipos Compartilhados

### Pacote `packages/shared/` (`@repo/shared`)

- Tipos de domínio, enums e schemas Zod usados tanto no frontend quanto no backend devem ficar em `packages/shared/`
- Exemplos: `User`, `Role`, `ApiError`, enums de status, schemas de validação reutilizáveis
- Ambos os apps importam com `import { User, Role } from "@repo/shared"`
- Se um tipo é usado **apenas** no frontend ou **apenas** no backend, ele deve ficar no respectivo app (não no shared)
- O pacote exporta via `src/index.ts` como barrel file

### Eden Treaty (client tipado do Elysia)

- O frontend **deve** usar Eden Treaty (`@elysiajs/eden`) como client HTTP para chamadas à API
- Eden infere automaticamente os tipos de request/response a partir do tipo do app Elysia, eliminando duplicação de contratos de API
- Configurar o client Eden em `@/services/api.ts` exportando a instância tipada
- Usar o client Eden dentro de `queryFn`/`mutationFn` do react-query
- O tipo do app Elysia deve ser exportado do backend (ex: `export type App = typeof app`) para que o Eden consiga inferir

### Onde cada tipo fica

| Tipo | Local |
|------|-------|
| Tipos de domínio compartilhados (User, Role, enums) | `@repo/shared` |
| Contratos de API (request/response) | Inferidos pelo Eden Treaty |
| Tipos exclusivos do frontend | `apps/web/src/types/` |
| Tipos exclusivos do backend (schemas de cada módulo) | `model.ts` de cada módulo |

---

## 3. Frontend (`apps/web/`)

### Data Fetching

- **SEMPRE** usar `useQuery` do `@tanstack/react-query` para leitura de dados. **NUNCA** usar `useEffect` para fetch
- Para mutações (POST, PUT, PATCH, DELETE), usar `useMutation` do `@tanstack/react-query`
- Usar o client Eden Treaty dentro de `queryFn`/`mutationFn`
- Invalidar queries relevantes após mutações com `queryClient.invalidateQueries()`

Exemplo de leitura:

```tsx
const { data, isPending, error } = useQuery({
  queryKey: ["recurso"],
  queryFn: () => api.recurso.get(),
});
```

Exemplo de mutação:

```tsx
const mutation = useMutation({
  mutationFn: (data: CreateRecurso) => api.recurso.post(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["recurso"] });
    toast.success("Recurso criado com sucesso!");
  },
  onError: () => {
    toast.error("Erro ao criar recurso.");
  },
});
```

### Componentes de Layout

- Toda página autenticada **deve** usar `PageLayout` de `@/components/page-layout.tsx` com breadcrumbs
- Toda renderização de query **deve** usar `ContentLoader` de `@/components/content-loader.tsx`, passando `loading`, `error` e `noContent`

Exemplo de uso combinado:

```tsx
export default function MinhaPagina() {
  const { data, isPending, error } = useQuery({...});

  return (
    <PageLayout breadcrumbs={[{ label: "Início", href: "/" }, { label: "Minha Página" }]}>
      <ContentLoader
        loading={isPending}
        error={error}
        noContent="Nenhum dado encontrado."
      >
        {data && <MeuComponente data={data} />}
      </ContentLoader>
    </PageLayout>
  );
}
```

### Gerenciamento de Estado

| Situação | Usar |
|----------|------|
| URL state (filtros, paginação, busca, tabs) | `nuqs` (`useQueryState`, `useQueryStates`) |
| Estado local de componente (toggle, modal, input temporário) | `useState` |
| Estado global compartilhado entre componentes não-relacionados | `zustand` |

- **NUNCA** usar Context API para estado que muda frequentemente (reservar Context para dados relativamente estáticos como auth)

### Formulários

- Usar `react-hook-form` com `zodResolver` do `@hookform/resolvers/zod`
- Schemas de validação com `zod` definidos em `@/types/index.ts` ou co-localizados com o componente
- Usar componentes Form do shadcn/ui: `Form`, `FormField`, `FormControl`, `FormItem`, `FormLabel`, `FormMessage` (de `@/components/ui/form`)

Exemplo:

```tsx
const form = useForm<MeuSchema>({
  resolver: zodResolver(meuSchema),
  defaultValues: { nome: "" },
});

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="nome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </form>
  </Form>
);
```

### UI e Estilo

- Componentes UI: **shadcn/ui** estilo **new-york** (em `@/components/ui/`)
- **NUNCA** criar componentes UI primitivos do zero — usar ou estender shadcn/ui
- Estilo: **Tailwind CSS 4** (classes utilitárias). Não usar CSS modules ou CSS-in-JS
- Função utilitária `cn()` de `@/lib/utils` para merge condicional de classes
- Ícones: `lucide-react`
- Notificações/Toasts: `sonner` (via `toast.success()`, `toast.error()`)

### Roteamento (react-router v7)

- Usar `useNavigate()` para navegação programática (**NUNCA** `window.location`)
- Usar `useParams()` para acessar parâmetros de rota
- Usar `useSearchParams()` ou `nuqs` para query params
- Rotas definidas em `@/routes/routes.tsx` como objetos passados para `useRoutes()`
- Rotas protegidas: usar `ProtectedRoute` com `allowedRoles`
- Rotas somente públicas (login, signup): usar `PublicRoute` com `onlyPublic`
- Usar `Outlet` para layouts aninhados

### API Client

- Usar Eden Treaty (`@elysiajs/eden`) como client HTTP tipado, configurado em `@/services/api.ts`
- Eden infere tipos de request/response diretamente do tipo do backend Elysia — não duplicar tipos de API manualmente
- Tipo de erro padrão da API: `ApiError` (`{ message, code, timestamp }`) definido em `@repo/shared`

### Autenticação

- Usar `useAuth()` de `@/contexts/AuthContext` para acessar `user`, `loading`, `error`, `login`, `logout`, `isAuthenticated`
- Após login/logout, a query `["usuarioLogado"]` é invalidada automaticamente

---

## 4. Backend (`apps/server/`)

### Estrutura de Módulos

Cada recurso em `apps/server/src/modules/<recurso>/` com 3 arquivos:

```
apps/server/src/modules/<recurso>/
├── index.ts    # Controller (instância do Elysia com prefix)
├── service.ts  # Service (abstract class com métodos static)
└── model.ts    # Schemas TypeBox (drizzle-typebox + t do Elysia) e tipos
```

- Exportar o controller nomeado (ex: `export const recursoController`) e registrar no app principal em `src/index.ts` com `.use(recursoController)`
- O tipo do app Elysia **deve** ser exportado em `src/index.ts` (`export type App = typeof app`) para que o Eden Treaty no frontend consiga inferir os tipos

### Modelo de Dados (model.ts)

- Usar `createInsertSchema`, `createSelectSchema`, `createUpdateSchema` do `drizzle-typebox` para gerar schemas a partir do schema Drizzle
- Exportar tipos com `typeof schema.static`
- Usar `t.Omit()` para esconder campos sensíveis (ex: password) do schema de resposta

Exemplo de referência (`apps/server/src/modules/user/model.ts`):

```ts
import { t } from "elysia";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-typebox";
import { users } from "@/drizzle/migrations/schema";

const _createUser = createInsertSchema(users, {
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 6 }),
});

export const createUser = t.Omit(_createUser, ["role"]);
export const _selectUser = createSelectSchema(users);
export const selectUser = t.Omit(_selectUser, ["password"]);
export const updateUser = createUpdateSchema(users);

export type UserCreate = typeof createUser.static;
export type UserUpdate = typeof updateUser.static;
export type User = typeof selectUser.static;
export type UserPlain = typeof _selectUser.static;
```

### Controller (index.ts)

- Criar com `new Elysia({ prefix: "/recurso" })`
- Usar `status()` obtido no handler para retornos com status code. **NUNCA** usar `set.status`
- Tipar **estritamente** tudo: `body`, `params`, `query`, `response` (incluindo múltiplos status codes no `response`)
- Usar `paramModel` de `@/plugin/model` para params reutilizáveis (ex: `params: "params-id"`)
- Registrar rotas públicas **antes** do `.use(authGuard)` e rotas autenticadas **depois**
- Usar macro `requireRole` para autorização por role (ex: `requireRole: "ADMIN"`)

Exemplo:

```ts
export const recursoController = new Elysia({ prefix: "/recursos" })
  .use(paramModel)
  // rotas públicas aqui (se houver)
  .use(authGuard)
  // rotas autenticadas abaixo
  .get(
    "",
    async ({ user }) => {
      return await RecursoService.findByUserId(user.id);
    },
    {
      response: t.Array(selectRecurso),
    },
  )
  .post(
    "",
    async ({ body, user, status }) => {
      const recurso = await RecursoService.create(body, user.id);
      return status(201, recurso);
    },
    {
      body: createRecurso,
      response: {
        201: selectRecurso,
      },
    },
  );
```

### Service (service.ts)

- `export abstract class XService` com métodos `static async`
- Queries Drizzle com `.returning()` no final de insert/update
- Se `.returning()` retornar array vazio, lançar `NotFoundError`
- Para recursos vinculados a usuário (FK `userId`):
  - **Buscar/Alterar**: SEMPRE filtrar com `.where(eq(tabela.userId, userId))` usando o `userId` obtido do handler (via `user.id` do `authGuard`)
  - **Criar**: incluir `userId` no `.values()` do insert, recebendo-o como parâmetro do service
- Importar tabelas de `@/drizzle/migrations/schema`

Exemplo:

```ts
export abstract class RecursoService {
  static async findByUserId(userId: string) {
    return await db
      .select()
      .from(recursos)
      .where(eq(recursos.userId, userId));
  }

  static async create(data: RecursoCreate, userId: string) {
    const [recurso] = await db
      .insert(recursos)
      .values({ ...data, userId })
      .returning();

    if (!recurso) throw new NotFoundError("Erro ao criar recurso.");
    return recurso;
  }

  static async update(data: RecursoUpdate, recursoId: string, userId: string) {
    const [recurso] = await db
      .update(recursos)
      .set(data)
      .where(and(eq(recursos.id, recursoId), eq(recursos.userId, userId)))
      .returning();

    if (!recurso) throw new NotFoundError("Recurso não encontrado.");
    return recurso;
  }
}
```

### Erros

Usar classes de erro de `@/error/index.ts`:

| Classe | Status | Uso |
|--------|--------|-----|
| `NotFoundError` | 404 | Recurso não encontrado |
| `UnauthorizedError` | 401 | Não autenticado |
| `ForbiddenError` | 403 | Sem permissão |
| `BadCredentialsError` | 401 | Credenciais inválidas |
| `CustomError` | Customizável | Base para erros personalizados |

O `onError` global em `src/index.ts` já trata `CustomError` e `DrizzleQueryError` retornando `{ message, code, timestamp }`.

### Database / Drizzle ORM

- Driver: `drizzle-orm/bun-sql`
- Instância do DB: `db` importada de `@/lib/db`
- Schema de tabelas em `apps/server/drizzle/migrations/schema.ts`
- Relations em `apps/server/drizzle/migrations/relations.ts`
- IDs gerados com `@paralleldrive/cuid2` (`createId()` no `$defaultFn` da coluna)
- Ao adicionar novas tabelas: definir no `schema.ts`, adicionar relations no `relations.ts`, rodar `bun run db:generate` e `bun run db:migrate`

### Cache e Infra

- Redis (`ioredis`) importado de `@/lib/redis` para cache quando necessário
- Email com Nodemailer via `@/lib/mail`

### Path Aliases do Backend

- `@/*` → `src/*`
- `@/drizzle/*` → `drizzle/*`
