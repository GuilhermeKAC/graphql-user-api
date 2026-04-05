# graphql-user-api

API GraphQL completa construída com Node.js, TypeScript, Apollo Server e Prisma. Implementa autenticação JWT, relacionamentos complexos, subscriptions em tempo real, DataLoaders e paginação cursor-based.

## Tecnologias

| Tecnologia | Versão | Finalidade |
|---|---|---|
| Node.js | 22.x | Runtime |
| TypeScript | 6.x | Tipagem estática |
| Apollo Server | 5.x | Servidor GraphQL |
| Prisma | 7.x | ORM + migrations |
| PostgreSQL | 16.x | Banco de dados |
| graphql-ws | 6.x | Subscriptions WebSocket |
| DataLoader | 2.x | Resolver problema N+1 |
| jsonwebtoken | 9.x | Autenticação JWT |
| bcryptjs | 3.x | Hash de senhas |

## Pré-requisitos

- Node.js 22+
- PostgreSQL 16+

## Instalação

```bash
# Clone o repositório
git clone https://github.com/GuilhermeKAC/graphql-user-api.git
cd graphql-user-api

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Gere o Prisma Client
npx prisma generate

# Execute as migrations
npx prisma migrate dev

# Gere os tipos TypeScript
npm run codegen
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz com as seguintes variáveis:

```env
DATABASE_URL="postgresql://postgres:senha@localhost:5432/graphql_user_db"
JWT_SECRET="seu-segredo-256-bits"
PORT=4000
NODE_ENV="development"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="5000000"
```

## Scripts

```bash
npm run dev       # Servidor em desenvolvimento com hot reload (tsx watch)
npm run build     # Compila TypeScript para dist/
npm run start     # Executa a versão compilada
npm run codegen   # Gera tipos TypeScript a partir do schema GraphQL
```

## Estrutura do Projeto

```
src/
├── @types/                     # Declarações de tipos globais
│   ├── global.d.ts             # Tipos globais (FileUpload)
│   └── graphql-upload.d.ts     # Tipos do graphql-upload
├── config/
│   ├── prisma.ts               # Instância singleton do Prisma Client
│   └── pubsub.ts               # PubSub para subscriptions
├── generated/
│   └── prisma/                 # Gerado por npx prisma generate
├── graphql/
│   ├── context/
│   │   ├── index.ts            # Contexto GraphQL (autenticação + prisma + loaders)
│   │   └── loaders.ts          # DataLoaders para resolver N+1
│   ├── directives/
│   │   └── auth.directive.ts   # Directive @auth para controle de acesso
│   ├── generated/
│   │   └── types.ts            # Gerado por npm run codegen
│   ├── resolvers/
│   │   ├── auth.resolver.ts    # login, register
│   │   ├── user.resolver.ts    # CRUD de usuários, follow/unfollow
│   │   ├── post.resolver.ts    # CRUD de posts, likes, paginação
│   │   ├── subscription.resolver.ts  # Eventos em tempo real
│   │   ├── scalars.resolver.ts # DateTime, JSON, Upload
│   │   └── index.ts            # Agrega todos os resolvers
│   └── schema/
│       ├── auth.graphql        # Mutations de autenticação
│       ├── user.graphql        # Tipos e operações de usuário
│       ├── post.graphql        # Tipos e operações de post/comment
│       ├── scalars.graphql     # Scalars customizados e directive @auth
│       └── index.ts            # Monta o schema executável
├── utils/
│   └── jwt.ts                  # Utilitários JWT (sign/verify)
└── server.ts                   # Entry point — HTTP + WebSocket
```

## Endpoints

| Protocolo | URL | Descrição |
|---|---|---|
| HTTP | `http://localhost:4000/graphql` | Queries e Mutations |
| WebSocket | `ws://localhost:4000/graphql` | Subscriptions |
| Playground | `http://localhost:4000/graphql` | Apollo Sandbox |

## Autenticação

A API usa JWT (JSON Web Token). Para acessar operações protegidas, inclua o token no header:

```http
Authorization: Bearer <token>
```

O token é obtido via `login` ou `register`.

---

## Operações GraphQL

### Autenticação

#### Registrar usuário

```graphql
mutation Register {
  register(data: {
    name: "João Silva"
    email: "joao@email.com"
    password: "senha123"
  }) {
    token
    user {
      id
      name
      email
      role
    }
  }
}
```

#### Login

```graphql
mutation Login {
  login(email: "joao@email.com", password: "senha123") {
    token
    user {
      id
      name
      role
    }
  }
}
```

---

### Usuários

#### Usuário autenticado `@auth`

```graphql
query Me {
  me {
    id
    name
    email
    role
    profilePicture
    createdAt
    followers { name }
    following { name }
  }
}
```

#### Buscar usuário por ID

```graphql
query User {
  user(id: "uuid-do-usuario") {
    id
    name
    email
    posts {
      title
      published
    }
  }
}
```

#### Atualizar usuário `@auth`

```graphql
mutation UpdateUser {
  updateUser(data: {
    name: "João Atualizado"
    email: "novo@email.com"
  }) {
    id
    name
    email
  }
}
```

#### Seguir / Deixar de seguir `@auth`

```graphql
mutation Follow {
  followUser(userId: "uuid-do-usuario")
}

mutation Unfollow {
  unfollowUser(userId: "uuid-do-usuario")
}
```

---

### Posts

#### Listar posts (offset-based)

```graphql
query Posts {
  posts(
    filter: { published: true }
    pagination: { skip: 0, take: 10 }
  ) {
    id
    title
    content
    published
    likesCount
    likedByMe
    author { name }
    comments {
      content
      author { name }
    }
  }
}
```

#### Listar posts com cursor-based pagination e filtros avançados

```graphql
query PostsConnection {
  postsConnection(
    first: 10
    after: "cursor-base64"
    where: {
      AND: [
        { published: { equals: true } }
        { title: { contains: "GraphQL" } }
      ]
    }
    orderBy: { createdAt: desc }
  ) {
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
      startCursor
    }
    edges {
      cursor
      node {
        id
        title
        published
        author { name }
      }
    }
  }
}
```

**Filtros disponíveis:**

```graphql
# AND — todas as condições devem ser verdadeiras
where: {
  AND: [
    { published: { equals: true } }
    { title: { contains: "Node" } }
  ]
}

# OR — qualquer condição pode ser verdadeira
where: {
  OR: [
    { title: { contains: "GraphQL" } }
    { title: { contains: "REST" } }
  ]
}

# NOT — nega a condição
where: {
  NOT: { published: { equals: false } }
}
```

#### Criar post `@auth`

```graphql
mutation CreatePost {
  createPost(data: {
    title: "Aprendendo GraphQL"
    content: "GraphQL é uma linguagem de consulta..."
    published: true
  }) {
    id
    title
    published
    createdAt
  }
}
```

#### Atualizar post `@auth`

```graphql
mutation UpdatePost {
  updatePost(
    id: "uuid-do-post"
    data: { title: "Título Atualizado", published: true }
  ) {
    id
    title
    published
    updatedAt
  }
}
```

#### Like / Unlike `@auth`

```graphql
mutation Like {
  likePost(postId: "uuid-do-post")
}

mutation Unlike {
  unlikePost(postId: "uuid-do-post")
}
```

---

### Comentários

#### Listar comentários de um post

```graphql
query Comments {
  comments(
    postId: "uuid-do-post"
    pagination: { skip: 0, take: 20 }
  ) {
    id
    content
    createdAt
    author { name }
  }
}
```

#### Criar comentário `@auth`

```graphql
mutation CreateComment {
  createComment(data: {
    postId: "uuid-do-post"
    content: "Ótimo post!"
  }) {
    id
    content
    author { name }
  }
}
```

---

### Subscriptions

As subscriptions usam WebSocket. No Apollo Sandbox, configure o endpoint WebSocket como `ws://localhost:4000/graphql`.

#### Novo post criado

```graphql
subscription PostCreated {
  postCreated {
    id
    title
    published
    author { name }
  }
}
```

#### Post atualizado

```graphql
subscription PostUpdated {
  postUpdated(id: "uuid-do-post") {
    id
    title
    published
    updatedAt
  }
}
```

#### Novo comentário em um post

```graphql
subscription CommentAdded {
  commentAdded(postId: "uuid-do-post") {
    id
    content
    author { name }
    createdAt
  }
}
```

---

## Directive @auth

Campos e operações protegidos são marcados com `@auth` no schema:

```graphql
# Requer apenas autenticação (qualquer role)
me: User! @auth

# Requer role ADMIN
users: [User!]! @auth(requires: ADMIN)
```

Tentar acessar uma operação protegida sem token retorna:

```json
{
  "errors": [{
    "message": "Não autenticado"
  }]
}
```

Tentar acessar sem a role adequada retorna:

```json
{
  "errors": [{
    "message": "Sem permissão. Requer role: ADMIN"
  }]
}
```

---

## Modelo de Dados

```
User
 ├── id (UUID)
 ├── email (único)
 ├── password (hash bcrypt)
 ├── name
 ├── role (USER | ADMIN | MODERATOR)
 ├── profilePicture (URL opcional)
 ├── posts → Post[]
 ├── comments → Comment[]
 ├── likes → Like[]
 ├── followers → Follow[]
 └── following → Follow[]

Post
 ├── id (UUID)
 ├── title
 ├── content
 ├── published
 ├── author → User
 ├── comments → Comment[]
 └── likes → Like[]

Comment
 ├── id (UUID)
 ├── content
 ├── author → User
 └── post → Post

Like (pivô N:N User ↔ Post)
 ├── userId
 └── postId (único por par)

Follow (self-relation N:N User ↔ User)
 ├── followerId
 └── followingId (único por par)
```

## Performance

### DataLoaders

A API implementa DataLoaders para resolver o problema N+1. Em vez de disparar uma query por item, os resolvers agrupam as requisições em batch:

```
# Sem DataLoader — 1 + N queries
SELECT * FROM posts            → 10 posts
SELECT * FROM users WHERE id = "1"
SELECT * FROM users WHERE id = "2"
... 10 queries individuais

# Com DataLoader — 2 queries
SELECT * FROM posts            → 10 posts
SELECT * FROM users WHERE id IN ("1", "2", ..., "10")
```

Loaders implementados:
- `loaders.user` — busca usuários por ID em batch
- `loaders.post` — busca posts por ID em batch
- `loaders.commentsByPost` — busca comentários por postId em batch

## Licença

ISC