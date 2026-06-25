<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/001-genshin-loadout-manager/plan.md`

Active feature: **Genshin Impact Loadout & Team Builder** (`001-genshin-loadout-manager`)
Stack: TypeScript monorepo (pnpm + Turborepo) — React 18 + Vite frontend, Fastify +
Prisma + PostgreSQL backend, shared pure `@app/stat-engine` (stat/synergy/damage) and
`@app/contracts` (Zod) packages. Tests: Vitest / Supertest / Playwright (test-first,
per Constitution Principle II). See `plan.md`, `data-model.md`, `contracts/`, `research.md`.
<!-- SPECKIT END -->
