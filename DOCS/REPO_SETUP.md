# DOCS/REPO_SETUP.md — Impostazione Repository (Monorepo)

> **Obiettivo:** realizzare il punto D1 del piano (`DOCS/plannin.md` §2): monorepo **pnpm workspaces + Turborepo** con le app `web` (Nuxt 3) e `api` (NestJS) e il package condiviso `shared` (tipi + Zod).
> **Stato:** scheletro creato e verificato. Nessun commit ancora eseguito.
> **Data:** 2026-10-21

---

## 1. Toolchain verificata

| Strumento | Versione | Note |
|-----------|----------|------|
| Node.js | v24.21.0 | OK per gli `engines` dei package |
| pnpm | 12.10.1 | package manager del workspace |
| corepack | 0.36.0 | disponibile |
| turbo | 2.11.10 | installato come devDep di root |
| TypeScript | 5.9.3 (pinnato) | TS 7.0.2 appena uscito, NON utilizzato (vedi §5) |

---

## 2. Cosa è stato fatto

### Struttura creata
```
comiKube/
├── package.json              # root: workspace, scripts turbo, engines
├── pnpm-workspace.yaml       # packages: apps/*, packages/*
├── pnpm-lock.yaml            # generato da pnpm install
├── turbo.json                # tasks: build / dev / typecheck
├── tsconfig.base.json        # tsconfig condiviso
├── .npmrc                    # auto-install-peers, strict-peer-dependencies=false
├── apps/
│   ├── web/                  # @comikube/web — Nuxt 3 + Pinia
│   │   ├── package.json
│   │   ├── nuxt.config.ts    # moduli @pinia/nuxt, transpile+noExternal di @comikube/shared
│   │   ├── app.vue           # pagina segnaposto
│   │   └── tsconfig.json
│   └── api/                  # @comikube/api — NestJS 12
│       ├── package.json
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── src/
│           ├── main.ts       # bootstrap NestFactory, porta da env PORT
│           └── app.module.ts
└── packages/
    └── shared/               # @comikube/shared — tipi, costanti, schemi Zod
        ├── package.json      # "exports": "./src/index.ts" (consumo da sorgente)
        ├── tsconfig.json
        └── src/index.ts      # Role, DEFAULT_FREE_DAILY_CREDITS, schemi user/project
```

### Contenuto del primo `shared` (scheletro reale, non vuoto)
- `ROLES` = `['writer','illustrator']` (ruoli come tag; single-player = entrambi)
- `DEFAULT_FREE_DAILY_CREDITS = 15` (provvisorio, da validare con l'unit economics — Fase 0)
- `PROJECT_STATUSES` = `idea | draft | in_progress | completed | published`
- `userSchema` / `projectSchema` in **Zod 4** + tipi derivati `User` / `Project`

### Azioni eseguite
1. Creati 18 file (config root + 3 workspace package).
2. `pnpm install` → 710 pacchetti risolti, lockfile generato.
3. **pnpm 12 blocca i build-script di default**: `esbuild@0.28.2` era ignorato → risolto con `pnpm approve-builds esbuild` (postinstall `node install.js` eseguito con successo).
4. Verifiche (vedi §3).

---

## 3. Verifiche eseguite (risultati reali)

| Verifica | Esito |
|----------|-------|
| `pnpm install` | ✅ "Already up to date", nessun errore |
| `pnpm approve-builds esbuild` | ✅ postinstall eseguito (binary presente) |
| `pnpm exec turbo --version` | ✅ 2.11.10 |
| `pnpm --filter @comikube/shared exec tsc --noEmit` | ✅ exit 0, schemi Zod 4 validi |
| `turbo run typecheck build --dry=json` | ✅ grafo corretto: `@comikube/api`, `@comikube/shared`, `@comikube/web` |

NON ancora eseguiti (di proposito, fase successiva): `turbo run typecheck` completo (richiede il wiring di `shared` nell'API), build/avvio delle app.

---

## 4. Versioni pinnate

| Package | Versione | Note |
|---------|----------|------|
| nuxt | ^3.21.11 | **Decisione aperta:** Nuxt 4.6.x è l'ultimo (vedi §5) |
| @nestjs/{core,common,platform-express} | ^12.2.0 | |
| @nestjs/cli | ^12.0.10 | |
| zod | ^4.6.7 | API v4 (`z.email()`, `z.enum`, `z.iso.*` disponibili) |
| vue | ^3.5.44 | |
| pinia / @pinia/nuxt | ^4.1.0 / ^1.0.3 | |
| turbo | ^2.11.10 | |
| typescript | ^5.9.3 | (non 7.0.2) |
| @types/node | ^24.0.0 | allineato al runtime node 24 |

---

## 5. Note specifiche pnpm 12 (da tenere a mente)

- **Il campo `"pnpm"` in package.json è IGNORATO** da pnpm 12 (warning in install). I settings ora vivono in `pnpm-workspace.yaml`.
- `pnpm approve-builds <pkg>` scrive `allowBuilds:` in `pnpm-workspace.yaml` (non `onlyBuiltDependencies`).
- pnpm 12 auto-aggiunge `minimumReleaseAgeExclude` a `pnpm-workspace.yaml`: metadato gestito da pnpm, non toccare a mano.
- esbuild è dipendenza transitiva: il suo binario NON è in `node_modules/.bin` (pnpm non hoista i bin transitivi). Si trova in `node_modules/.pnpm/.../esbuild/bin`.

---

## 6. Decisioni aperte (da chiudere NEL prossimo step)

1. **Nuxt 3 vs Nuxt 4.** Il piano (§1.1 plannin.md) specifica Nuxt 3, ma l'ultimo stabile è Nuxt 4.6.x. Impatto: diversa struttura directory (`app/`) e config. Da chiudere PRIMA di scrivere pagine reali.
2. **Consumption di `@comikube/shared` nell'API NestJS.** Ora `shared` è esposto da sorgente (`exports` → `src/index.ts`). tsc/Nest potrebbero non compilarlo senza: (a) `paths` mapping, (b) build di `shared` su `dist/` con `main/types` su dist, (c) project references. Da scegliere.
3. **TS 7.0.2 (native)**: disponibile ma non ancora adottato dall'ecosistema. Rivalutare più avanti.

---

## 7. Cosa RESTA da fare (checklist in ordine)

- [ ] **Commit iniziale** del monorepo (git add + commit sul branch `ns/create-planning`)
- [ ] Chiudere la decisione **Nuxt 3 vs Nuxt 4** (§6.1)
- [ ] Chiudere il **wiring di `@comikube/shared` nell'API** (§6.2) e far passare `turbo run typecheck` su tutto il monorepo
- [ ] Aggiungere **ESLint + Prettier** (root config; richiedono i task `lint`/`format` in turbo)
- [ ] Smoke test: `pnpm --filter @comikube/web dev` e `pnpm --filter @comikube/api dev` (verificare che servono)
- [ ] **CI/CD** (GitHub Actions): `pnpm install --frozen-lockfile` + `turbo run typecheck` + `turbo run build`
- [ ] Creare `.env.example` (PORT, e in seguito: chiave provider AI, Redis URL)
- [ ] (Fase motore AI, NON ora) Redis + BullMQ: il piano prevede Redis per rate-limiting e code

---

## 8. Riferimenti

- Piano completo: `DOCS/plannin.md` §2 (decisioni D1-D8) e §4 (Roadmap Fase 1)
- Questo file è il **log di esecuzione** del primo punto (impostazione repo); aggiornarlo a ogni step completato.