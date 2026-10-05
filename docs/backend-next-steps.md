# Backend: next steps

What to build in `apps/api` next, in a suggested order. The web app already has the screens for all of it. Today login and tasks run on mocks in the browser, and each step here replaces a mock with the real thing or adds something the web app is already listening for.

This page says what to build and what to watch out for. The exact request and response shapes are in the contract: [apps/web/README.md](../apps/web/README.md#api-contract-for-the-missing-modules).

| #   | Step                         | What you get                               | Switch in the web app     |
| --- | ---------------------------- | ------------------------------------------ | ------------------------- |
| 1   | Validate input               | 400 with clear messages instead of 500     | none                      |
| 2   | Tasks module                 | the board saves to the database            | `VITE_MOCK_TASKS=false`   |
| 3   | Task events over the socket  | the board updates live for everyone        | none                      |
| 4   | Project feed, leaving rooms  | the project list updates live              | none                      |
| 5   | Auth                         | real users and protected routes            | `VITE_MOCK_AUTH=false`    |
| 6   | Chat history                 | messages survive a reload                  | needs a small web change  |
| 7   | Redis adapter, Cache-Control | ready for more than one API instance       | none                      |

The flags are in `apps/web/.env.development`. Restart `npm run dev` after changing one.

Why this order: step 1 is small and every later module uses it. Step 2 repeats what you did for projects, so it is the quickest visible result. Steps 3 and 4 reuse the EventEmitter2 pattern that `ProjectsService` already has. Auth is the biggest piece, and nothing before it depends on it.

## 1. Validate input

**Today.** `main.ts` has no `ValidationPipe`, and the DTOs have no decorators. `class-validator` and `class-transformer` are installed but not used. A `POST /projects` without `name` reaches Postgres and comes back as a 500.

**Build.**

- A global `ValidationPipe` in `main.ts`. Look at the `whitelist` and `transform` options.
- `class-validator` decorators on `CreateProjectDto`. `UpdateProjectDto` gets them through `PartialType`.

**Watch out.**

- The web app's "New project" dialog sends `team: []`, `startDate` as an ISO string, and always a `description`. A rule such as "team must not be empty" would break it.
- `description` is optional in the DTO and in the entity's type, but its column is NOT NULL. Decide which one is true and make them agree.

**Done when.** `POST /projects` with `{}` returns 400 and names the missing fields, and creating a project from the web app still works.

## 2. Tasks module

**Build.** A `TasksModule` shaped like `ProjectsModule`: a `Task` entity, DTOs with validation, a service and a controller with four routes. Two routes sit under a project (`GET` and `POST /projects/:projectId/tasks`) and two address a task directly (`PATCH` and `DELETE /tasks/:id`).

**Watch out.**

- **`position` must be a floating-point column** (`float`, which is `double precision` in Postgres). The web app sends values such as `1500` or `1250.5`: the midpoint between the two cards a task is dropped between. An integer column would lose them. A `decimal` column would come back from the database as a string and break the sorting.
- **`projectId` must appear in the JSON as a number.** If you model it as a relation to `Project`, also expose the foreign key as a plain column.
- **Deleting a project that has tasks.** Without `onDelete: 'CASCADE'` on the relation, `DELETE /projects/:id` will fail once tasks exist.
- A new task goes to the end of its column: give it a position larger than the largest one in that project and status.
- `POST` to a project that does not exist should return 404. `ProjectsModule` already exports `ProjectsService`.
- `status` accepts only `todo`, `in_progress` and `done`.
- `DELETE` returns the deleted task, as `ProjectsService.remove` does for projects.

**Done when.** With `VITE_MOCK_TASKS=false`, you can create, edit, drag and delete tasks on the board and they are still there after a reload.

**Expect this.** The board starts empty, because the mock's tasks lived in the browser. And until step 3 is done, a second tab no longer updates by itself: the mock had its own way of telling other tabs, and the real API does not announce changes yet.

## 3. Task events over the socket

**Build.** The same two-part pattern `ProjectsService` already starts:

1. `TasksService` emits an EventEmitter2 event after each change.
2. A gateway method with `@OnEvent(...)` forwards it to the project's room with `server.to(room).emit(...)`.

The socket event names have to match the contract exactly: `taskCreated` and `taskUpdated` carry the whole task, `taskDeleted` carries `{ id, projectId }`. The web app reads only `projectId` from them and then reloads that project's tasks, so `projectId` must be in every payload.

**Watch out.**

- The delete event needs `projectId` to know which room to send to, so include it in the internal event too. `project.removed` only carries `id`.
- The room name is built in `ChatGateway.roomName`. If you add a second gateway class, it shares the same socket server as long as neither sets a namespace, so it can emit to the same rooms. Keep the room name in one place.

**Done when.** The same board open in two different browsers stays in sync without a refresh.

## 4. Project feed and leaving rooms

**Today.** `ProjectsService` emits `project.created`, `project.updated` and `project.removed`, and nothing listens to them. The web app already listens for the socket events and already sends `leaveProject` when a board is closed; the API ignores it.

**Build.**

- The `FeedGateway` from your plan: `@OnEvent` handlers that send `projectCreated`, `projectUpdated` (the whole project) and `projectRemoved` (`{ id }`) to every connected client.
- A `leaveProject` handler in `ChatGateway` that takes the socket out of the room.

**Done when.** A project created from Postman appears in the web app's project list without a refresh. After moving from one board to another, the socket no longer receives the first project's messages.

## 5. Auth

**Build.**

- A `User` entity (unique email, name, password hash) and a way to create users. The web app has no sign-up page yet, so `POST /auth/register` called from Postman is enough to start.
- `POST /auth/login` returning `{ accessToken, user }`.
- A guard that protects every route except login and register.
- A check of the token when a socket connects.

**Watch out.**

- Never store or return the plain password. `user` in the response is `{ id, email, name }` only.
- A wrong password should be a 401 with a `message`. The login page shows that message as it is.
- The web app sends `Authorization: Bearer <token>` on every request, and signs the user out on any 401.
- The socket sends the token in the handshake, readable as `client.handshake.auth.token`. Guards run for messages, not for the connection itself, so the connection has to be checked in `handleConnection`.

**Done when.** With `VITE_MOCK_AUTH=false`: a wrong password shows an error on the login page, a correct one gets in, and a request without a token returns 401.

**After this.** Chat messages can carry the user's id and name instead of the socket id. That needs a small change in the web app.

## 6. Chat history

**Build.** A `Message` entity, saved in the `sendMessage` handler, and `GET /projects/:projectId/messages` returning the latest messages, oldest first.

The web app keeps messages in memory only, so it needs a small change to load the history when a board opens.

## 7. Scaling and caching

Already in your plan, and neither changes anything for the web app:

- The socket.io Redis adapter, so rooms work when more than one API instance is running.
- `Cache-Control` headers on the `GET` endpoints.

## Loose ends

Small things, in no particular order.

**The unit tests fail.** `npm run test -w api` on 3 October 2026: all 4 suites fail, for three different reasons.

| Spec | Error | Direction |
| ---- | ----- | --------- |
| `app.controller.spec.ts` | `Nest can't resolve dependencies of the AppController (AppService, ?)` – `HealthRepository` is missing | provide a fake repository in the testing module |
| `chat/chat.gateway.spec.ts` | `Cannot find module 'src/projects/projects.service'` | Jest does not know the `src/` shortcut. Either import with a relative path, as the rest of the code does, or add a `moduleNameMapper` to the Jest config |
| `projects/*.spec.ts` (2 suites) | `SyntaxError: Unexpected token 'export'` in `@nestjs/event-emitter` | the package ships as ES modules, which Jest does not read from `node_modules` by default. Mock the package in the spec, or let Jest transform it with `transformIgnorePatterns` |

**The e2e tests cannot see `.env`.** The `start` scripts pass `--env-file ../../.env`, the test script does not. `envFilePath: ['.env', '../../.env']` in `ConfigModule.forRoot` covers every way of starting the app.

**Not needed yet.**

- A global `/api` prefix. If you add `app.setGlobalPrefix('api')`, remove the `rewrite` line in `apps/web/vite.config.ts`.
- CORS. In development the browser only talks to Vite, which forwards to the API. It becomes necessary when the web app is served from a different address than the API.
- Migrations. `synchronize: true` is fine while developing and should go before anything is deployed with real data.
