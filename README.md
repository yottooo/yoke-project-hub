# Yoke – project hub with real-time chat

Yoke keeps a team's projects, task board and chat in one place. The repo holds two apps:

- `apps/api` – NestJS (Express) + TypeORM API backed by PostgreSQL, with Redis caching and a Socket.IO chat room for each project.
- `apps/web` – React + Vite web app with the project list and a drag-and-drop task board. Login and tasks run on mocks until the API has them.

Everything runs in Docker Compose: PostgreSQL, Redis, pgAdmin, the API and the web app. Nothing needs to run on your machine except Docker.
## Design
# Projects Page
<img width="1940" height="1512" alt="image" src="https://github.com/user-attachments/assets/00e3b467-4c68-4fbf-be0a-6064e17b0b45" />
# Tasks
<img width="2015" height="1296" alt="image" src="https://github.com/user-attachments/assets/99b75d0b-a88b-475a-8316-71b594d539a9" />

## Prerequisites

- Docker Desktop (with Docker Compose)

## Run

1. Create a `.env` file in the project root

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
   ```

   These values are used by both Docker Compose and the API. Inside Compose, the API container overrides `DB_HOST`, `DB_PORT`, `REDIS_HOST` and `REDIS_PORT` to reach the `db` and `redis` services, so `DB_PORT` here only sets the port Postgres is published on for your host tools.

2. Build and start everything

   ```bash
   docker compose up -d --build
   ```

   The API container runs pending migrations and then starts Nest in watch mode. The web container runs Vite. Both reload when you edit files on your machine, because the repo is bind-mounted into them. The containers restart on their own when Docker starts, so after this first run there is nothing to start by hand.

The API is now at http://localhost:3000 and the web app at http://localhost:5173.

### Day-to-day

```bash
docker compose logs -f api web     # follow app logs
docker compose restart api         # restart one service
docker compose up -d --build -V    # after changing dependencies (rebuilds and recreates the node_modules volumes)
```

Each app container keeps its own Linux `node_modules` in a volume, separate from any `node_modules` on your machine. To add a package, edit `package.json` (or run `docker compose exec api npm install <pkg> -w api`) and then rebuild with `-V` as shown above.

## Check it works

- http://localhost:3000 – hello endpoint
- http://localhost:3000/db-test – confirms the database connection
- http://localhost:5173 – the web app (login is mocked for now, so any email and password work)
- http://localhost:5050 – pgAdmin (login with `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` from `.env`)

To connect pgAdmin to the database, add a server with host `db`, port `5432`, and the `DB_USERNAME` / `DB_PASSWORD` from `.env`.

See [apps/web/README.md](apps/web/README.md) for how the web app talks to the API and what is still mocked.

## HTTP endpoints

| Method | Path            | Description                    |
| ------ | --------------- | ------------------------------ |
| GET    | `/`             | Hello endpoint                 |
| GET    | `/db-test`      | Checks the database connection |
| POST   | `/projects`     | Create a project               |
| GET    | `/projects`     | List projects                  |
| GET    | `/projects/:id` | Get a project by id            |
| PATCH  | `/projects/:id` | Update a project               |
| DELETE | `/projects/:id` | Delete a project               |

## Real-time chat (Socket.IO)

A Socket.IO server runs on the same port as the HTTP API. Each project has its own chat room.

Client → server events:

- `joinProject` with `{ projectId: number }` – joins the project's room. The server replies with `joinedProject` and `{ projectId }`, or with `error` and `{ message }` if the project does not exist.
- `sendMessage` with `{ projectId: number, text: string }` – broadcasts the message to everyone in the project's room.

Server → client events:

- `newMessage` with `{ projectId, text, senderId, sentAt }`

Example with `socket.io-client`:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('newMessage', (msg) => console.log(msg));

socket.emit('joinProject', { projectId: 1 });
socket.emit('sendMessage', { projectId: 1, text: 'Hello!' });
```

## Stop

```bash
docker compose down        # stop containers, keep data
docker compose down -v     # stop containers and delete the database volume
```

## Other scripts

Run scripts inside the containers with `docker compose exec`. API scripts take `-w api` and web scripts take `-w web` (the workspace names):

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

## License

[MIT](LICENSE) © [yottooo](https://github.com/yottooo). You are free to use, change and share the code, as long as the copyright notice and the license text stay with it.
