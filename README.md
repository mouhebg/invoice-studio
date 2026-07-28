# Invoicy

Invoicy is a professional invoicing and business management platform for
self-employed professionals and small businesses.

## Current platform

- Public marketing website
- Protected user accounts
- Business dashboard with receivables and payment metrics
- Client management
- Invoice creation with line items, discounts, taxes, and payment tracking
- Draft, sent, overdue, and paid invoice states
- Printable invoice pages
- Recurring invoice settings
- Business profile and default currency settings
- Account-level data separation

## Technology

- Next.js 16
- React 19
- TypeScript
- Vinext and Cloudflare Workers
- Cloudflare D1
- Drizzle ORM
- Node.js test runner and ESLint

## Local development

Requirements:

- Node.js 22.13 or newer
- npm

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Run the project checks:

```bash
npm test
npm run lint
npm run build
```

Generate a new database migration after changing `db/schema.ts`:

```bash
npm run db:generate
```

## Deployment

The application uses server-rendered routes, authenticated account pages, and a
relational database. It therefore requires a full-stack host and cannot run as a
static GitHub Pages application. GitHub Pages serves the public product website,
while the account workspace is deployed separately.

The full application expects:

- A Cloudflare D1 database bound as `DB`
- A trusted authentication gateway that removes client-supplied identity
  headers before adding verified user information
- The verified email header `x-invoicy-user-email`
- The optional display-name header `x-invoicy-user-name`
- Deployment-specific `/login` and `/logout` routes

Header names and authentication paths can be changed with
`INVOICY_USER_EMAIL_HEADER`, `INVOICY_USER_NAME_HEADER`,
`INVOICY_SIGN_IN_PATH`, and `INVOICY_SIGN_OUT_PATH`.

The production domain is intended to be `invoicy.ca`.

## Planned integrations

- Online payment processing
- Transactional invoice email delivery
- Automated recurring invoice jobs
- Custom domain configuration
- Production tax and compliance review
