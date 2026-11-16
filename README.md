# Yoke – project hub with a live task board and chat

Yoke keeps a team's projects, task board and chat in one place. The repo holds two apps:

- `apps/api` – NestJS (Express) + TypeORM API backed by PostgreSQL. It has JWT login, Redis caching for projects, and Socket.IO for chat and live board updates.
- `apps/web` – React + Vite web app: sign-up and login, the project list, and a drag-and-drop board with columns, epics and a chat for each project.

## Features

- **Accounts** – register and log in with email and password. The API returns a JWT, and every endpoint except `/`, `/db-test` and `/auth/*` needs it.
- **Projects** – create, rename and delete projects. Project reads are cached in Redis for 60 seconds.
- **Task board** – each project has its own columns (statuses). A new project starts with To do, In progress and Done. You can add, rename, recolor, reorder and delete columns, and drag cards within and between columns.
- **Epics** – group tasks toward a goal, with a color and optional start and end dates. An epic bar above the board shows each epic's progress, and you can filter the board by epic (`?epic=<id>` or `?epic=none` in the URL).
- **Live updates** – every task, column and epic change goes out over Socket.IO to everyone viewing that project, so open boards stay in sync across tabs, browsers and users.
- **Chat** – each project has a real-time chat room.

## Design

### Projects page

<img width="1940" height="1512" alt="Projects page" src="https://github.com/user-attachments/assets/00e3b467-4c68-4fbf-be0a-6064e17b0b45" />

### Task board

<img width="2301" height="1075" alt="Task board" src="https://github.com/user-attachments/assets/839b1fe3-1528-4261-9734-58482a42edbd" />

## Run

There are two ways to run Yoke. Pick one, not both, because they publish the same ports (5432, 6379 and 5050).

| | Option A: Docker Compose | Option B: Terraform |
| --- | --- | --- |
| Postgres, Redis, pgAdmin | containers from `docker-compose.yml` | containers from `infra/main.tf` |
| API and web app | containers, with hot reload | run on your machine with Node |
| You need | Docker Desktop | Docker Desktop, Terraform ≥ 1.5, Node.js 22+ (the containers use 24) |

Both options read the same `.env` file in the project root. Create it first:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=project_hub

PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=admin

REDIS_HOST=localhost
REDIS_PORT=6379

# Signs login tokens. Use any long random string; the API will not start without it.
JWT_SECRET=change-me-to-a-long-random-string
```

### Option A: Docker Compose

```bash
docker compose up -d --build
```

The API container runs pending migrations and then starts Nest in watch mode. The web container runs Vite. Both reload when you edit files, because the repo is bind-mounted into them. Inside Compose, the API overrides `DB_HOST`, `DB_PORT`, `REDIS_HOST` and `REDIS_PORT` to reach the `db` and `redis` services. So in `.env`, `DB_PORT` only sets the host port Postgres is published on. The containers restart when Docker starts, so you only run this command once.

Day to day:

```bash
docker compose logs -f api web     # follow app logs
docker compose restart api         # restart one service
docker compose up -d --build -V    # after changing dependencies (rebuilds and recreates the node_modules volumes)
```

Each app container keeps its own Linux `node_modules` in a volume, separate from any `node_modules` on your machine. To add a package, edit `package.json` (or run `docker compose exec api npm install <pkg> -w api`), then rebuild with `-V` as shown above.

Stop:

```bash
docker compose down        # stop containers, keep data
docker compose down -v     # stop containers and delete the database volume
```

### Option B: Terraform

`infra/main.tf` uses the [kreuzwerker/docker](https://registry.terraform.io/providers/kreuzwerker/docker/latest) provider to create Postgres, Redis and pgAdmin on your local Docker, on a network called `yoke`. It does not create the API or the web app. You run those with Node, and they reach the services on `localhost`, which is what `.env` already says.

1. Fill in the Terraform variables. Keep them in sync with `.env`:

   ```bash
   cd infra
   cp terraform.tfvars.example terraform.tfvars
   ```

   On macOS or Linux, also uncomment `docker_host = "unix:///var/run/docker.sock"` in `terraform.tfvars`. The default works for Docker Desktop on Windows.

2. Create the infrastructure:

   ```bash
   terraform init      # once: downloads the Docker provider
   terraform plan      # preview what will change
   terraform apply     # create or update the containers
   ```

   When it finishes, `terraform apply` prints the Postgres and Redis addresses and the pgAdmin URL. Run `terraform output` to see them again.

3. Install dependencies, run migrations and start both apps from the repository root:

   ```bash
   cd ..
   npm install
   npm run migration:run -w api
   npm run dev                       # API on :3000 and web on :5173, both with hot reload
   ```

   `npm run dev:api` or `npm run dev:web` starts just one of them.

Stop:

```bash
cd infra
terraform destroy   # removes the containers, the network and the database volume (your data too)
```

To stop the apps, press Ctrl+C in the `npm run dev` terminal. The Terraform containers use `restart = "always"`, so they come back when Docker starts, until you run `terraform destroy`.

## Check it works

With either option:

- http://localhost:5173 – the web app. Create an account on the sign-up page, then log in.
- http://localhost:3000 – hello endpoint
- http://localhost:3000/db-test – confirms the database connection
- http://localhost:5050 – pgAdmin. Log in with `PGADMIN_EMAIL` / `PGADMIN_PASSWORD`, then add a server with host `db`, port `5432` and the `DB_USERNAME` / `DB_PASSWORD` from `.env`.

To try the API directly:

```bash
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"secret123","name":"Me"}'

curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"secret123"}'
# -> { "accessToken": "...", "user": { ... } }

curl http://localhost:3000/projects -H "Authorization: Bearer <accessToken>"
```

## HTTP endpoints

All endpoints except the first four need `Authorization: Bearer <accessToken>`. Request and response shapes are in [apps/web/README.md](apps/web/README.md#api-contract).

| Method | Path                            | Description                                  |
| ------ | ------------------------------- | -------------------------------------------- |
| GET    | `/`                             | Hello endpoint                               |
| GET    | `/db-test`                      | Checks the database connection               |
| POST   | `/auth/register`                | Create an account                            |
| POST   | `/auth/login`                   | Log in, returns `{ accessToken, user }`      |
| GET    | `/auth/me`                      | The logged-in user                           |
| POST   | `/projects`                     | Create a project (with the default columns)  |
| GET    | `/projects`                     | List projects                                |
| GET    | `/projects/:id`                 | Get a project                                |
| PATCH  | `/projects/:id`                 | Update a project                             |
| DELETE | `/projects/:id`                 | Delete a project                             |
| GET    | `/projects/:projectId/statuses` | List a project's columns                     |
| POST   | `/projects/:projectId/statuses` | Add a column                                 |
| PATCH  | `/statuses/:id`                 | Rename, recolor or move a column             |
| DELETE | `/statuses/:id`                 | Delete a column (must be empty, not the last one) |
| GET    | `/projects/:projectId/tasks`    | List a project's tasks                       |
| POST   | `/projects/:projectId/tasks`    | Create a task                                |
| PATCH  | `/tasks/:id`                    | Update or move a task                        |
| DELETE | `/tasks/:id`                    | Delete a task                                |
| GET    | `/projects/:projectId/epics`    | List a project's epics                       |
| POST   | `/projects/:projectId/epics`    | Create an epic                               |
| PATCH  | `/epics/:id`                    | Update or reorder an epic                    |
| DELETE | `/epics/:id`                    | Delete an epic (its tasks are kept)          |

## Real-time (Socket.IO)

A Socket.IO server runs on the same port as the HTTP API. Each project has a room, `project-{id}`, used by both the chat and the board.

Client → server:

- `joinProject` with `{ projectId: number }` – joins the project's room. The server replies with `joinedProject` and `{ projectId }`, or with `error` and `{ message }` if the project does not exist.
- `sendMessage` with `{ projectId: number, text: string }` – broadcasts a chat message to the room.

Server → client, sent to the project's room:

| Event | Payload |
| --- | --- |
| `newMessage` | `{ projectId, text, senderId, sentAt }` |
| `taskCreated`, `taskUpdated` | the task |
| `taskDeleted` | `{ id, projectId }` |
| `statusCreated`, `statusUpdated` | the column |
| `statusDeleted` | `{ id, projectId }` |
| `epicCreated`, `epicUpdated` | the epic |
| `epicDeleted` | `{ id, projectId }` |

Example with `socket.io-client`:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { auth: { token: accessToken } });

socket.on('newMessage', (msg) => console.log(msg));
socket.on('taskUpdated', (task) => console.log('task changed', task));

socket.emit('joinProject', { projectId: 1 });
socket.emit('sendMessage', { projectId: 1, text: 'Hello!' });
```

## Other scripts

With Docker Compose, run scripts inside the containers with `docker compose exec`. With Terraform, run the same `npm` commands from the repository root without the `docker compose exec api` / `web` prefix. API scripts take `-w api` and web scripts take `-w web` (the workspace names):

```bash
docker compose exec api npm run migration:generate -w api -- src/migrations/Name
docker compose exec api npm run migration:run -w api
docker compose exec api npm run lint -w api         # eslint with --fix
docker compose exec api npm run format -w api       # prettier
docker compose exec api npm run test -w api         # unit tests
docker compose exec api npm run test:e2e -w api     # e2e tests
docker compose exec api npm run build -w api        # compile to apps/api/dist/

docker compose exec web npm run build -w web        # type-check and production build
docker compose exec web npm run lint -w web         # oxlint
```

## More docs

- [apps/web/README.md](apps/web/README.md) – how the web app talks to the API, the full API contract and the live-update rules
- [docs/](docs/README.md) – plans, open issues and design notes

## License

[MIT](LICENSE) © [yottooo](https://github.com/yottooo). You are free to use, change and share the code, as long as the copyright notice and the license text stay with it.
