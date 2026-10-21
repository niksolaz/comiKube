# DOCS/REPO_SETUP.md — Impostazione Repository (Monorepo)

> **Obiettivo:** punto D1 del piano (`DOCS/plannin.md` §2): monorepo **pnpm workspaces + Turborepo**.
> **Stato:** COMPLETATO e verificato end-to-end.
> **Commit:** `4cae64b` (scaffold) + commit successivo (Nuxt 4 + wiring di `@comikube/shared`).
> **Data:** 2026-10-21

---

## 1. Riepilogo (cosa è stato fatto)

- Monorepo pnpm (workspaces) + Turborepo: `apps/web`, `apps/api`, `packages/shared`.
- **web** = Nuxt 4 + Pinia (struttura `app/`).
- **api** = NestJS 12, con `AppController` che consuma `@comikube/shared` (prova di wiring).
- **shared** = tipi + costanti + schemi Zod 4, compilato a **CommonJS** (`dist/`), consumato da web e api.

## 2. Struttura

```
comiKube/
├── package.json                 # root: workspace, scripts turbo, engines
├── pnpm-workspace.yaml          # packages + allowBuilds (pnpm-managed)
├── pnpm-lock.yaml
├── turbo.json                   # build/typecheck con dependsOn ^build
├── tsconfig.base.json
├── .npmrc
├── apps/
│   ├── web/                     # Nuxt 4 + Pinia
│   │   ├── package.json         # nuxt ^4.6.2, vue-tsc, typescript
│   │   ├── nuxt.config.ts
│   │   ├── tsconfig.json
│   │   └── app/app.vue          # importa @comikube/shared
│   └── api/                     # NestJS 12
│       ├── package.json
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           └── app.controller.ts  # GET / consuma @comikube/shared
└── packages/
    └── shared/
        ├── package.json         # main/types → dist/index.js|d.ts
        ├── tsconfig.json        # module CommonJS
        └── src/index.ts         # Role, DEFAULT_FREE_DAILY_CREDITS, schemi user/project
```

## 3. Verifiche eseguite (risultati reali)

| Verifica | Esito |
|----------|-------|
| `pnpm install` | ✅ clean |
| `pnpm approve-builds esbuild` | ✅ postinstall ok |
| `pnpm --filter @comikube/web exec nuxt build` | ✅ 7.3s, build completa |
| `turbo run typecheck` | ✅ 4/4 task ok (shared build + shared/api/web typecheck) |
| `turbo run build` | ✅ 3/3 task ok |
| Smoke test runtime API: `GET /` | ✅ `{"roles":["writer","illustrator"],"defaultFreeDailyCredits":15}` |

## 4. Versioni pinnate

| Package | Versione |
|---------|----------|
| nuxt | ^4.6.2 |
| @nestjs/{core,common,platform-express} | ^12.2.0 |
| @nestjs/cli | ^12.0.10 |
| zod | ^4.6.7 |
| vue | ^3.5.44 |
| pinia / @pinia/nuxt | ^4.1.0 / ^1.0.3 |
| turbo | ^2.11.10 |
| typescript | ^5.9.3 |
| vue-tsc | ^3.3.13 |
| @types/node | ^24.0.0 |

## 5. Note tecniche / insidie incontrate

- **pnpm 12**: (a) il campo `"pnpm"` in package.json è ignorato — i settings stanno in `pnpm-workspace.yaml`; (b) i build-script sono bloccati di default → `pnpm approve-builds <pkg>` scrive `allowBuilds:`; (c) `minimumReleaseAgeExclude` è auto-gestito da pnpm.
- **Nuxt 4**: `ssr.noExternal` è `boolean` (non più `string[]`); `nuxt typecheck` richiede `vue-tsc` + `typescript` come devDeps del package web.
- **shared CJS**: emettendo CommonJS da `dist/`, sia Nest (tsc CJS) sia Vite/Nuxt (bundler) lo consumano senza frizioni ESM/CJS. Il `transpile`/`noExternal` non servono più.

## 6. Decisioni chiuse

1. **Nuxt 3 → Nuxt 4.** Greenfield, nessun codice da migrare; Nuxt 4 resta su Vue 3 e Nuxt 3 è in manutenzione.
2. **Wiring di `@comikube/shared`** → build CJS su `dist/`; turbo `build`/`typecheck` usano `dependsOn: ^build` (shared prima dei consumer).
3. **TypeScript 5.9.3** (non 7.0.2): resta aperta una rivalutazione futura di TS 7 (native).

## 7. Cosa RESTA da fare

- [ ] ESLint + Prettier (config root) + task turbo `lint`/`format`
- [ ] CI/CD GitHub Actions: `pnpm install --frozen-lockfile` + `turbo run typecheck` + `turbo run build`
- [ ] `.env.example` (PORT, e in seguito chiave provider AI, Redis URL)
- [ ] (fase motore AI, NON ora) Redis + BullMQ per rate-limiting e code
- [ ] Nota dev: `shared` va ricompilato (`pnpm --filter @comikube/shared build`) prima di `pnpm dev` se si modificano i tipi; valutare un watch (`tsc -w`) per la DX

## 8. Riferimenti

- Piano completo: `DOCS/plannin.md` §1.1 (monorepo), §2 (decisioni), §4 (roadmap).
- Questo file è il log di esecuzione del primo punto; aggiornarlo a ogni step.