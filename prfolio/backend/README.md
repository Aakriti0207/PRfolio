# PRfolio backend

The backend is an Express and TypeScript API backed by PostgreSQL and Prisma. It owns GitHub OAuth, sessions, synchronization, private PR management, and public profiles.

## Setup

1. Copy `.env.example` to `.env` and set every value. `TOKEN_ENCRYPTION_KEY` must be 64 hexadecimal characters.
2. Install dependencies with `npm install`.
3. Generate Prisma Client and create the database schema:

```bash
npm run prisma:generate
npx prisma migrate dev --name init
```

4. Start development with `npm run dev`, or build and start with `npm run build && npm start`.

GitHub OAuth callback: `http://localhost:4000/api/auth/github/callback`. Configure this exact callback URL in the GitHub OAuth application. The frontend must send `credentials: "include"` for API requests.

## API

All JSON responses use `{ "success": true, "data": ... }` or `{ "success": false, "error": { "code": "...", "message": "..." } }`.

- `GET /api/health`
- `GET /api/auth/github`, `GET /api/auth/github/callback`, `GET /api/auth/me`, `POST /api/auth/logout`
- `POST /api/github/sync`
- `GET /api/prs`, `GET /api/prs/:id`, `PATCH /api/prs/:id`, `GET /api/prs/stats`
- `GET /api/profile/:slug`

Private routes use an HTTP-only session cookie and enforce ownership server-side. Public profiles never return hidden PRs or credentials.
