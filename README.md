# Yoke – project hub with real-time chat

Yoke keeps a team's projects, task board and chat in one place. The repo holds two apps:

- `apps/api` – NestJS (Express) + TypeORM API backed by PostgreSQL, with Redis caching and a Socket.IO chat room for each project.
- `apps/web` – React + Vite web app with the project list and a drag-and-drop task board. Login and tasks run on mocks until the API has them.

PostgreSQL and Redis run in Docker Compose; the apps run with Node on your machine.
## Design
# Projects Page
<img width="1940" height="1512" alt="image" src="https://github.com/user-attachments/assets/00e3b467-4c68-4fbf-be0a-6064e17b0b45" />
# Tasks
<img width="1966" height="1928" alt="image" src="https://github.com/user-attachments/assets/7360b8f1-3c0a-4ba8-a7b1-923c5ca21476" />

## Prerequisites

- Node.js 22.22+
- Docker Desktop (with Docker Compose)

## Run locally

1. Install dependencies

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root

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

   These values are used by both Docker Compose and the API. Change them if you like, except the Redis ones: Docker Compose always publishes Redis on port `6379`.
   Optionally set `PORT` to change the port the API listens on (default `3000`). If you do, change `API_TARGET` in `apps/web/vite.config.ts` to match, because the web app proxies its requests to that port.

3. Start PostgreSQL, pgAdmin and Redis

   ```bash
   docker compose up -d
   ```

4. Start the apps in watch mode

   ```bash
   npm run dev        # API and web together
   npm run dev:api    # API only
   npm run dev:web    # web only
   ```

The API is now at http://localhost:3000 and the web app at http://localhost:5173.

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

API scripts are run with `-w api` and web scripts with `-w web` (the workspace names):

```bash
npm run build -w api        # compile to apps/api/dist/
npm run start:prod -w api   # run compiled build
npm run lint -w api         # eslint with --fix
npm run format -w api       # prettier
npm run test -w api         # unit tests
npm run test:e2e -w api     # e2e tests

npm run build -w web        # type-check and production build
npm run lint -w web         # oxlint
```

`npm run build` without `-w` builds both apps.

## License

[MIT](LICENSE) © [yottooo](https://github.com/yottooo). You are free to use, change and share the code, as long as the copyright notice and the license text stay with it.
