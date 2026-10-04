# Yoke web

React front end for the Yoke API: login, project list, a Jira-style task board with drag and drop, and a project chat.

Vite + React + TypeScript, TanStack Query, React Router, socket.io-client, Tailwind + shadcn/ui, dnd-kit.

## Run

From the repository root, with the API's containers up (`docker compose up -d`):

```bash
npm run dev        # API on :3000 and this app on :5173
npm run dev:web    # this app only
```

Open http://localhost:5173.

Other scripts, also from the root:

```bash
npm run build -w web   # type-check and production build
npm run lint -w web    # oxlint
```

## How it talks to the API

The browser only ever talks to the Vite dev server. `vite.config.ts` proxies:

- `/api/*` to `http://localhost:3000/*` (the `/api` prefix is stripped, because the API has no global prefix and both apps have a `/projects` path)
- `/socket.io` to the same server, including WebSocket upgrades

So the API needs no CORS setup in development.

## What is real and what is mocked

| Feature          | Source                                                        |
| ---------------- | ------------------------------------------------------------- |
| Projects         | the real API (`/projects`)                                    |
| Chat             | the real gateway (`joinProject`, `sendMessage`, `newMessage`) |
| Login            | mock, until the API has an auth module                        |
| Tasks, the board | mock, until the API has a tasks module                        |

The mocks live in `src/api/mocks.ts` and keep their data in the browser's localStorage. Each is switched by a flag in `.env.development`:

```env
VITE_MOCK_AUTH=true
VITE_MOCK_TASKS=true
```

Set a flag to `false` once the matching Nest module exists. Nothing else changes: `src/api/auth.ts` and `src/api/tasks.ts` pick the mock or the real implementation behind the same interface. Restart `npm run dev` after editing the file.

## Live updates

One rule keeps the board current: whenever tasks change, the task list is reloaded from the API. It is all in `src/features/board/queries.ts`.

- your own change: the list is reloaded when the request finishes. A drag is also shown right away, before the API answers (an optimistic update), so the card does not jump back.
- someone else's change: the app is told which project changed and reloads that project's list (`useLiveTasks`).

Who does the telling follows the tasks flag, through `tasksApi.subscribe` in `src/api/tasks.ts`:

- real API: socket events in the project's room
- mock: a `BroadcastChannel`, which reaches every tab of the same browser

So with the mock, a board open in two tabs already stays in sync. Across browsers and users it needs the API to emit the events below.

One socket serves the whole app (`src/lib/socket.ts`), opened after login. Chat and board share it and the room `project-{id}`.

## API contract for the missing modules

This is what the front end calls. The types are in `src/api/types.ts`.

### Auth

```
POST /auth/login   { email, password }   ->  { accessToken, user }

user = { id: number, email: string, name: string }
```

Every request then carries `Authorization: Bearer <accessToken>`. A `401` from any endpoint signs the user out. The socket sends the same token as `auth.token` in the handshake.

### Tasks

```
GET    /projects/:projectId/tasks                                             ->  Task[]
POST   /projects/:projectId/tasks  { title, description?, status?, assignee? }  ->  Task
PATCH  /tasks/:id                  { title?, description?, status?, position?, assignee? }  ->  Task
DELETE /tasks/:id                                                             ->  Task

Task = {
  id: number
  projectId: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  position: number        // order inside a column, ascending
  assignee: string | null
  createdAt: string       // ISO date
  updatedAt: string       // ISO date, must change on every update
}
```

- `position` is any number. When a card is dropped, the front end sends a value between its new neighbours, so the API only has to save it. A new task should get a position after the last one in its column.

### Socket events

Emitted by the API to the room `project-{projectId}` after each task change:

```
taskCreated   Task
taskUpdated   Task
taskDeleted   { id, projectId }
```

The front end only reads `projectId` from these and reloads that project's tasks.

Emitted to everyone, for the project list (the planned FeedGateway):

```
projectCreated   Project
projectUpdated   Project
projectRemoved   { id }
```

Sent by the client when it leaves a board (optional to handle; until then the client filters events by `projectId`):

```
leaveProject   { projectId }
```

## Layout

```
src/
  main.tsx, router.tsx   entry point and the routes
  api/          fetch client, types, one file per resource, mocks.ts
  lib/          the socket, the query client
  features/
    auth/       login page, route guard, session hook
    projects/   project list and the new-project dialog
    board/      board, columns, cards, task dialog, card positions
    chat/       chat popup
  layouts/      the signed-in shell (top bar)
  components/ui/  shadcn/ui components, generated
```

In each feature, `queries.ts` holds everything that loads or changes data; the other files are what is on screen.

To add a board column, add the status to `TaskStatus` in `src/api/types.ts` and an entry to `BOARD_COLUMNS` in `src/features/board/columns.ts`.
