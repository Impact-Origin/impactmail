<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ImpactMail

Read this before working on ImpactMail.

## What it is

ImpactMail is Impact-Origin's newsletter app, a fork of [MailCheap](https://github.com/marclou/mailcheap) (AGPL-3.0, `LICENSE`) for its own use: write an issue, send it to the list, publish it on the web. Everything the dashboard does also works from an AI agent, through a REST API and an MCP server. It runs on Railway (`railway.json`); the README is the setup guide.

## How it's organized

Next.js App Router in JavaScript, Tailwind CSS with shadcn/ui, MongoDB through Mongoose, Better Auth for sign-in.

- **Dashboard**: `app/(app)` (overview, campaigns, contacts, newsletters, domains, API keys), `app/(account)` (account), `app/admin`, the sign-in at `app/signin` and the newsletter setup at `app/welcome`.
- **Public pages**: the docs in `app/(site)`, each newsletter's archive in `app/archive`, and what emails link to (`app/unsubscribe`, `app/confirm`, `app/keep`, tracking in `app/o` and `app/c`). `proxy.js` routes newsletters' own hosts to their archive and only checks that a session cookie is there.
- **Actions**: every customer action is one `defineAction` in `lib/actions/<group>.js` (schemas, permission, handler). `runAction` is the only way to run one: from the dashboard's server actions, the REST API (`app/api/v1`) and MCP (`/mcp`, `lib/mcp/server.js`). The docs, the OpenAPI document and the llms files are generated from the same schemas, and `tests/parity.test.mjs` fails when an action is missing from any of them.
- **Accounts**: `scoped(account, filter)` (`lib/account-scope.js`) adds the account to every query, and a Mongoose plugin refuses customer queries without one. `requireAccount()` for pages and server actions, `authenticateRequest()` for the API and MCP (`lib/auth.js`, `lib/api-keys.js`).
- **MCP and OAuth**: API keys, or OAuth access tokens from Better Auth's OAuth provider (`lib/auth.js`, `lib/oauth.js`, `lib/oauth-rules.js`), with the consent page at `app/oauth/consent`.
- **Jobs**: QStash calls `app/api/jobs/*`: sending batches, scheduled sends, first-send checks and the purge of deleted accounts. With `CRON_SECRET` set, the server calls its own cron routes (`lib/scheduler.js`, started in `instrumentation.js`): `app/api/cron/hourly`, PostShiba's team status, and `app/api/cron/postmaster` every day: Gmail's spam rates from Google Postmaster Tools (`lib/postmaster.js`), connected on `/admin`.
- **Email providers**: `lib/email-provider` switches between `ses.js` and `postshiba.js` (tenants, domains, sends), and their events become one shape (`lib/email-event-rules.js`). ImpactMail's own emails (sign-in codes, alerts) go through `lib/platform-email.js`: Resend, or the provider.
- **Alerts**: `sendAlert` (`lib/alerts.js`) emails an account's owner, or `ADMIN_EMAILS` for the admins'. `lib/alert-rules.js` says which admin alerts need someone; those go to Telegram too (`lib/telegram.js`) when it's set up. A new admin alert gets its kind there, or `tests/alerts.test.mjs` fails.
- **Storage**: models in `models/`, images in S3 behind CloudFront or in Vercel Blob (`lib/image-storage.js`), rate limits in Upstash Redis or memory (`lib/rate-limit.js`).

## Who signs in

Only the allowlist (`ADMIN_EMAILS`, `ALLOWED_EMAILS`, `lib/config.js`). There are no plans, billing or limits.

## Rules

- The code is public: never commit secrets, keys, tokens or personal data (emails, phone numbers, addresses, customers' data), in code, tests, fixtures or commit messages. Tests use `example.com` and made-up values.
- Write "ImpactMail" in display text: copy, titles, emails, docs, comments. Lowercase in identifiers and machine names: `impactmail`, `LogoImpactmail`, package and file names. Cookie names, rate-limit prefixes and key-derivation labels keep `mailcheap`: changing them signs everyone out or breaks sent links.
- The app's copy is in European Portuguese (pt-PT), informal "tu", infinitive verbs on buttons. Numbers, dates and rates go through `lib/format.js` (`LOCALE`). The docs site (`app/(site)`) and the API and MCP descriptions stay in English.
- Copy is plain and short, in sentence case: only the first word of a title or a button is capitalized.

## Code style

- JavaScript, no TypeScript. Tabs. Don't run Prettier: it reformats whole files.
- Components in `components/`, in PascalCase and named by their kind first (`ButtonCopy.jsx`, `CardUsage.jsx`); other files in kebab-case. Server components by default, `"use client"` only where the browser is needed.
- Comments only for what the code can't show: a constraint, a reason, an outside rule. Not what the next line does.
- Read the code around a change and write like it.

## Tests

```bash
npm test       # node --test, the integration tests start their own mongod: it has to be on the PATH (or MONGOD_PATH)
npm run lint
npm run build
```

Tests import server actions and route handlers as they are; `tests/setup` stubs Next.js request APIs and every outside service, so nothing reaches the network. A change to behavior comes with its test, and the full suite and lint pass before it's pushed.
