# StellarTickets — Frontend

Next.js app for [StellarTickets](https://github.com/StellarTickets) —
*Secure. Verifiable. Powered by Stellar.*

Marketing site, organizer dashboard, resale marketplace, and gate-staff
verification tool, all talking to the
[backend API](https://github.com/StellarTickets/backend), which in turn
reads and writes through the
[`ticketing`](https://github.com/StellarTickets/blockchain) Soroban contract.
This app never talks to Stellar/Soroban directly — every on-chain action goes
through the backend and a browser wallet.

## What is StellarTickets?

StellarTickets is a ticketing platform where **every ticket is a blockchain
asset**, not just a database row or a barcode someone could screenshot and
reuse. That one design choice solves the problems that plague normal
ticketing:

- **Counterfeiting and duplicate entry** — a ticket's owner and status live
  on the Stellar network, not in a database an insider could edit. The
  `/verify` page checked by gate staff confirms both the QR code *and* the
  on-chain record before letting anyone in, so a photographed or duplicated
  ticket simply doesn't work.
- **Scalping** — organizers set a resale price cap (e.g. "never more than
  120% of face value") and an optional royalty on every resale, and the
  Soroban contract enforces both automatically. No secondary-market app can
  route around it, because the cap is on-chain, not a website's policy.
- **Opaque resale** — when a ticket does resell, the payment settles
  atomically on-chain: royalty to the organizer, remainder to the seller,
  ownership to the buyer, all in one transaction or none of it happens.
- **"Is this ticket real?" uncertainty** — anyone (an attendee, a scanner
  app, another platform) can call the contract's read-only `verify_ticket`
  and get an authoritative answer, without trusting StellarTickets' servers
  to be honest about it.

The same underlying model — an **event** that issues **tickets** which can be
checked in, transferred, and optionally resold under organizer-set rules —
covers all twelve industries the platform targets: concerts, flights, sports,
festivals, conferences, buses, movie theaters, museums, tourist attractions,
public transport, universities, and corporate events. A "ticket" is a
festival wristband in one organizer's dashboard and a bus seat in another's;
the contract and this app don't need to know the difference beyond a
`category` label.

**Who uses this app, specifically:**

- **Organizers** sign up, create an organization, and use `/dashboard` to
  create events, define ticket types (price, quantity, tier), and publish
  the event on-chain — which is what actually opens sales.
- **Attendees** register, buy or receive tickets, and use `/my-tickets` to
  view them, transfer them to someone else, or list them for resale;
  `/marketplace` is where they browse other attendees' resale listings.
- **Gate staff** use `/verify` on event day to scan a ticket's QR code and
  check it in (or revoke it, if it's fraudulent) — a check-in can never be
  replayed, so the same ticket can't admit two people.

This repo is the surface all three of those people actually touch — see
[Pages](#pages) below for the full route-by-route breakdown, and the
[blockchain repo's "why one contract for every industry"](https://github.com/StellarTickets/blockchain#why-one-contract-for-every-industry)
section for how the on-chain side of this design works.

## Table of contents

- [What is StellarTickets?](#what-is-stellartickets)
- [New to this stack? Start here](#new-to-this-stack-start-here)
- [Non-custodial wallet flow](#non-custodial-wallet-flow)
- [How this fits with the other repos](#how-this-fits-with-the-other-repos)
- [Pages](#pages)
- [Getting started](#getting-started)
- [Environment](#environment)
- [Testing](#testing)
- [Project structure](#project-structure)
- [More documentation](#more-documentation)

## New to this stack? Start here

A plain-language glossary for anyone new to Next.js's App Router or the
Stellar-specific pieces. Skip this if you already know the stack.

| Term | What it means | Why it matters here |
|---|---|---|
| **Next.js App Router** | The `src/app/` directory convention where each folder is a route and `page.tsx` is what renders there (e.g. `src/app/marketplace/page.tsx` → `/marketplace`). | This repo is on **Next.js 16**, which has real breaking changes from older versions — see [`AGENTS.md`](AGENTS.md) before assuming Next 14/15 patterns apply. |
| **Server Component** | The Next.js default: a component that renders on the server and ships no JavaScript to the browser for itself. | Most pages here start as Server Components for fast initial loads; anything that needs interactivity (forms, wallet buttons) opts into a Client Component with `"use client"`. |
| **Client Component** | A component marked `"use client"` — runs in the browser, can use state/effects/browser APIs. | Required for anything touching Freighter, since signing a transaction is inherently a browser-side action. |
| **[Freighter](https://www.freighter.app/)** | A browser extension wallet for Stellar — like MetaMask, but for Stellar/Soroban. Holds the user's private key and signs transactions on request. | This app never asks a user for their private key. It asks Freighter to sign, and Freighter is the only thing that ever touches the key. |
| **XDR** | Stellar's binary transaction format. See the [blockchain repo's glossary](https://github.com/StellarTickets/blockchain#new-to-this-stack-start-here) for the full picture. | Every on-chain action here is: get unsigned XDR from the backend → Freighter signs it → send the signed XDR back. |
| **Non-custodial** | This app (and the backend behind it) never holds a private key that could move a user's funds or sign on their behalf. | See the next section — it's why every ticket action needs a wallet popup instead of just happening silently. |
| **Vitest** | A fast, Vite-based test runner, API-compatible with Jest. | `npm test` runs it; test files sit next to the code they test (`*.test.ts`/`*.test.tsx`). |
| **Tailwind CSS** | A utility-class CSS framework — styling is done with classes like `flex items-center gap-2` directly in JSX rather than separate stylesheet files. | Every component in `src/components` is styled this way; see [`docs/STYLING.md`](docs/STYLING.md). |
| **`NEXT_PUBLIC_` prefix** | Any env var starting with this is inlined into the client-side JavaScript bundle at build time — i.e. it is **not secret**. | `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_STELLAR_NETWORK*` are public by design; never put a secret behind this prefix. |

## Non-custodial wallet flow

This app never sends a private key anywhere. Every on-chain action (create
event, issue/purchase/transfer/check-in/revoke a ticket, list/cancel/buy a
resale listing) follows the same three-step pattern:

1. Ask the backend to **build** an unsigned, fee-prepared XDR transaction for
   the action (e.g. `POST /tickets/purchase`).
2. Have [Freighter](https://www.freighter.app/) **sign** it client-side — see
   [`src/lib/wallet.ts`](src/lib/wallet.ts), which wraps
   `@stellar/freighter-api`'s `isConnected`/`requestAccess`/`signTransaction`.
   The private key stays inside the extension the whole time.
3. Send the signed XDR back to the backend's **confirm** endpoint (e.g.
   `POST /tickets/confirm-purchase`), which relays it to Soroban RPC.

[`src/lib/onchain.ts`](src/lib/onchain.ts) wires these three steps into one
`signAndSubmit()` helper so page components don't repeat them; every page
under `src/app/dashboard`, `src/app/verify`, `src/app/marketplace`, and
`src/app/my-tickets` calls it the same way. If Freighter isn't installed or
the user rejects the signature request, the flow fails closed — nothing is
submitted.

## How this fits with the other repos

```text
┌─────────────────────┐      confirm-*      ┌──────────────────────┐
│      this repo        │ ───────────────────▶│       backend           │
│  (Next.js, browser)   │                      │  (NestJS + Postgres)   │
│                        │◀──── build-*XDR ─────│                         │
└──────────┬─────────────┘                      └───────────┬───────────┘
           │  Freighter signs client-side                    │
           ▼                                                  ▼
   (private key never leaves          ┌─────────────────────────────────┐
    the browser extension)            │  `ticketing` Soroban contract     │
                                       │       (Stellar network)           │
                                       └─────────────────────────────────┘
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Marketing landing page — brand, mission, all 12 supported industries |
| `/about` | About the project |
| `/login`, `/register` | Auth, backed by the backend's JWT endpoints |
| `/dashboard` | Organizer: create an organization, see your organizations |
| `/dashboard/organizations/[id]` | Create events under an organization |
| `/dashboard/events/[id]` | Add ticket types, publish on-chain, issue tickets |
| `/verify` | Gate staff: look up a ticket by its QR code, check in or revoke it |
| `/my-tickets` | Attendee: view owned tickets, transfer or list for resale |
| `/marketplace` | Browse and buy resale-listed tickets |
| `/security` | Security policy / responsible disclosure info |

## Getting started

**Prerequisites:** Node.js ≥ 22 (see [`.nvmrc`](.nvmrc)), the
[backend](https://github.com/StellarTickets/backend) running locally (or
reachable), and the [Freighter](https://www.freighter.app/) browser
extension installed for any wallet-signed action.

```bash
git clone https://github.com/StellarTickets/frontend.git
cd frontend

npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at a running backend
npm run dev                   # http://localhost:3001
```

Or with Docker:

```bash
docker compose up
```

## Environment

See [`.env.example`](.env.example) for the full list.

| Variable | Meaning |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the [backend](https://github.com/StellarTickets/backend) API |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` / `futurenet` / `mainnet` — must match the backend's `STELLAR_NETWORK` and whatever network the user's Freighter wallet is set to, or signed transactions will be rejected |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | The matching network passphrase (e.g. `"Test SDF Network ; September 2015"` for testnet), used when building/verifying transactions client-side |
| `NEXT_PUBLIC_TICKETING_CONTRACT_ID` | *Optional.* The deployed `ticketing` contract address (same as the backend's `TICKETING_CONTRACT_ID`). When set, published events link to the contract on stellar.expert (testnet/mainnet only) |

All of these are `NEXT_PUBLIC_` — see the glossary above for what that implies.

## Testing

```bash
npm run lint        # ESLint
npx tsc --noEmit    # type-check without emitting output
npm test             # Vitest
npm run build        # production build — also catches type/build errors CI cares about
```

## Project structure

```text
.
├── src
│   ├── app                     # routes — see Pages above
│   │   ├── dashboard
│   │   ├── marketplace
│   │   ├── my-tickets
│   │   ├── verify
│   │   ├── login / register
│   │   ├── about / security
│   │   ├── layout.tsx           # root layout, providers
│   │   └── page.tsx              # landing page
│   ├── components               # navbar, footer, wallet-connect-button, ticket-mockup, ...
│   └── lib
│       ├── wallet.ts             # Freighter connect/sign wrapper
│       ├── onchain.ts            # build -> sign -> confirm helper
│       ├── api.ts                # typed backend API client
│       ├── auth-context.tsx      # signed-in session state
│       └── types.ts              # mirrors the backend's Event/Ticket shapes
├── docs                          # architecture, wallet integration, design system, FAQ
├── public                        # static assets
├── Dockerfile / docker-compose.yml
├── AGENTS.md / CLAUDE.md         # notes for AI coding assistants on Next.js 16 breaking changes
└── README.md
```

## More documentation

The [`docs/`](docs/README.md) directory goes deeper on specific topics:

| Doc | Covers |
|---|---|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How this app fits into the wider system |
| [`WALLET_INTEGRATION.md`](docs/WALLET_INTEGRATION.md) | Freighter + build/sign/submit in depth |
| [`ROUTING.md`](docs/ROUTING.md) | App Router conventions used here |
| [`STATE_MANAGEMENT.md`](docs/STATE_MANAGEMENT.md) | How auth/session state is handled |
| [`COMPONENTS.md`](docs/COMPONENTS.md) | Component conventions |
| [`STYLING.md`](docs/STYLING.md) | Tailwind CSS conventions |
| [`FORMS.md`](docs/FORMS.md) | Form validation patterns |
| [`MARKETPLACE.md`](docs/MARKETPLACE.md) | Resale marketplace flow |
| [`RESPONSIVE_DESIGN.md`](docs/RESPONSIVE_DESIGN.md) | Breakpoints and layout approach |
| [`ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) | Accessibility conventions |
| [`BROWSER_SUPPORT.md`](docs/BROWSER_SUPPORT.md) | Supported browsers |
| [`PERFORMANCE.md`](docs/PERFORMANCE.md) | Performance conventions |
| [`SEO.md`](docs/SEO.md) | Metadata, sitemap, OG image conventions |
| [`I18N.md`](docs/I18N.md) | Internationalization notes |
| [`ANALYTICS.md`](docs/ANALYTICS.md) | Analytics approach |
| [`THIRD_PARTY.md`](docs/THIRD_PARTY.md) | Third-party integrations |
| [`ENVIRONMENT.md`](docs/ENVIRONMENT.md) | Environment variable reference |
| [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Production deployment notes |
| [`TESTING.md`](docs/TESTING.md) | Test suite conventions |
| [`DESIGN_HISTORY.md`](docs/DESIGN_HISTORY.md) | Design decisions and their rationale |
| [`BRAND.md`](docs/BRAND.md) | Brand/visual identity guidelines |
| [`GLOSSARY.md`](docs/GLOSSARY.md) | Extended terminology |
| [`FAQ.md`](docs/FAQ.md) | Common questions |

See also [`CONTRIBUTING.md`](CONTRIBUTING.md), [`SECURITY.md`](SECURITY.md),
and [`CHANGELOG.md`](CHANGELOG.md).
