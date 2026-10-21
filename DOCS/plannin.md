# comiKube — Piano di Azione & Valutazione (v2)

> **Progetto:** piattaforma SaaS di co-creazione fumetti (incontro sceneggiatori ↔ disegnatori, strumenti AI, pubblicazione e-book a layout fisso).
> **File:** `DOCS/plannin.md`
> **Versione:** v2 — integra i correttivi di revisione (vedi §0.2)
> **Data:** 2026-10-21

---

## 0. Scopo e log delle revisioni

### 0.1 Scopo
Documento di decisione: (1) valutazione critica del piano proposto, (2) decisioni architetturali, (3) strategia commerciale, (4) roadmap MVP, (5) metriche, (6) verdetto finale.

### 0.2 Log revisioni — v1 → v2 (cosa è stato corretto)
1. **Coerenza sui pagamenti.** Risolta la contraddizione: era stato detto "posticipa i pagamenti" ma poi si reintroduceva il mercato pay-for-hire (che è una feature di pagamento multi-party). Ora il perimetro è netto (§1.2): l'MVP mantiene **solo** i crediti AI single-payer; tutto il multi-party (Connect, fee editoriale, royalty, escrow/pay-for-hire) è posticipato.
2. **Disciplina di scope sulle revenue.** Un solo ricavo primario per l'MVP (crediti), gli altri flussi trasformati in ipotesi post-MVP con trigger.
3. **Fix del cold start.** Introdotta la modalità single-player (§3.4): il tool deve avere valore per UN solo creatore, così si cresce un lato alla volta.
4. **Validazione prima del build.** Aggiunta Fase 0 (interviste + smoke test + concierge) (§3.8, §4).
5. **Wedge ≠ moat.** Distinzione esplicita tra canale di lancio (nicchia IT/EU) e difese reali (community/data, stile per-creator, pipeline integrata) (§3.3).
6. **Coerenza copyright ↔ IP.** Chiarita la tensione tra "AI = prototipazione" e "pipeline IP": il valore IP si accumula sulle opere rifinite da umani; i bozzetti AI sono work-product (§3.6).
7. **Metriche e criteri di kill.** Aggiunti (§5).
8. **Reality-check team.** Scope MVP dimensionato per un team piccolo; lista esplicita "fuori dall'MVP" (§4).
9. **Percorso di espansione.** Italia → Europa, per non restare in una nicchia con tetto basso (§3.7).

---

## 1. Valutazione del piano proposto

### 1.1 Solidità della scelta del Monorepo (Nuxt 3 + Vue 3 + Pinia / Node)

**Verdetto: scelta solida e consigliata per questo stack specifico.** Il monorepo è la decisione giusta, a patto di imporre disciplina sui confini.

Punti a favore:
- Condivisione reale di artefatti: DTO, tipi TypeScript, schemi **Zod** e costanti tra frontend Nuxt e backend Node. Il modello `User` "unico" (ruoli come flag/tag) genera tipi usati identicamente su entrambi i lati.
- Tooling e linting uniformi, un unico `lockfile` (pnpm), CI/CD condiviso.
- `Turborepo` con cache remota accelera build/test incrementali dell'MVP.

Insidie da presidiare:
1. **Coupling** — `packages/shared` deve contenere solo *tipi, schemi, costanti e funzioni pure*; niente logica di business né dipendenze pesanti.
2. **Nuxt e transpile dei package locali** — include i package eseguibili in `nuxt.config.ts` → `build.transpile` (o alias `/^@packages/`); con Vite alias + `ssr.noExternal`.
3. **Zero leakage server→browser** — vietare import di codice server-only (segreti, lib crypto/server) dentro `shared`; `import type` + check CI (`eslint-plugin-boundaries`).
4. **Deploy indipendenti** — frontend e API restano pipeline separate con trigger su path (`apps/web/**`, `apps/api/**`).
5. **Layer cache Docker** — ordinare i `COPY` per sfruttare la cache pnpm.

**Struttura proposta:**
```
comiKube/
  apps/web/          # Nuxt 3
  apps/api/          # Node (NestJS: DI + moduli scalano meglio di Express puro)
  packages/shared/   # types, zod schemas, costanti (enum ruoli, limiti crediti, stati progetto)
  packages/ui/       # (opzionale) componenti Vue condivisi
```

### 1.2 Pagamenti — perimetro chiarito e posticipato

**Verdetto: era la parte più debole del piano. Ora è stata delimitata: il multi-party è posticipato, resta solo il flusso single-payer dei crediti.**

**Decisione (v2):**
- ✅ **Mantenuto nell'MVP:** acquisto di **crediti AI** (single-payer, un cliente paga direttamente la piattaforma). Flusso semplice: Checkout / PaymentIntent sul conto principale. Nessuna KYC sui creatori, nessuno split, nessuna custodia di fondi di terzi, nessun DAC7. IVA gestita come vendita di servizio digitale standard (Stripe Tax).
- ⛔ **Posticipato (studio dedicato in corso):** tutto il multi-party — Stripe Connect, fee editoriale € 19,99, split royalty 80/20, e il mercato pay-for-hire/escrow. Motivazione: sono il layer regolatorio/operativo più pesante e non bloccano la validazione del prodotto.

Le criticità già individuate sul multi-party (documentate come reference per la fase successiva, NON per l'MVP):
1. **Split "alla fonte" vs store esterni:** le vendite su store esterni (KDP, Apple Books, Google Play, Kobo) non transitano da Stripe; gli store pagano la piattaforma a D+60/90. Serve un layer di tesoreria/contabilità royalty (Stripe Transfers ex-post), non solo Connect.
2. **KYC onboarding creator** (Connect Onboarding hosted).
3. **Webhook/idempotenza/refund/chargeback/dispute.**
4. **DAC7** (rendicontazione fiscale automatica dei compensi creator).
5. **IVA** sulla fee e sui servizi digitali (OSS intra-UE).
6. **PSD2 / "trasmissione di denaro"** se il flusso è "raccogli-poi-gira" (mitigare con destination charges / Transfers, valutare Stripe Treasury).
7. **ISBN** — si ottiene come editore registrato (Agenzia ISBN/EDISER), non si "assegna".
8. **"Tutela legale" nella fee** — non prometterla in assoluto: contratti-tipo redatti da legale + disclaimer.

### 1.3 Gestione architetturale delle code asincrone in Node.js

**Verdetto: direzione giusta (Redis + rate limiting), completata con job queue e separazione dei processi.**

Premessa: la generazione AI è **I/O-bound** (attesa sull'API del provider), non blocca l'event loop di per sé; bloccano invece le operazioni **CPU/memory-bound** (render layout fisso, conversione ePub/PDF, elaborazione immagini). Due strategie diverse.

Architettura consigliata:
1. **BullMQ (su Redis)** come job queue (naturale successore di Bull, Redis c'è già; no Kafka/RabbitMQ per l'MVP).
   - **Producer:** l'API enqueue e risponde `202 Accepted` con `job_id` (mai attendere l'immagine nella request).
   - **Worker:** processo separato (`apps/api/worker.ts`), concurrency controllata (3-5 job) per rispettare i rate-limit del provider.
2. **Code dedicate per tipo** con limiti diversi: `image-generation`, `thumbnail`, (`epub-generation`, `royalty-payout` → **future, fuori MVP**). Retry/backoff esponenziale, `removeOnComplete` per non gonfiare Redis.
3. **CPU-bound** → processo Python separato per ePub/PDF (WeasyPrint/reportlab o `pandoc`) chiamato dal worker, oppure tutto-Node con Puppeteer/Vivliostyle dentro `worker_threads`/pool `piscina`.
4. **Progresso in tempo reale** via **SSE** (fallback WebSocket): worker pubblica stato su Redis Pub/Sub (`job:*:progress`), l'API inoltra al client.
5. **Rate limiting a due livelli:** ingress (Redis sliding window/token bucket, reset mezzanotte, `INCR`+`EXPIRE` su `credits:{userId}:{yyyy-mm-dd}`) + code (BullMQ `limiter` + `delay`).
6. **Anti-blocco event loop:** mai `JSON.parse/stringify` di payload enormi nel handler, mai crypto sync, mai `fs.*Sync`.

### 1.4 Rischi — rivalutazione su due orizzonti

**Orizzonte MVP (breve termine) — rischi principali:**
1. **Cold-start / attivazione** — mitigato dalla modalità single-player (§3.4): il tool deve essere utile a UN creatore da solo, così il valore non dipende dal matching a due lati.
2. **Unit economics AI** — rischio n.1 residuo dell'MVP: se il costo/immagine supera il valore dei crediti, o la qualità (consistenza personaggi) è insoddisfacente, il freemium muore per churn o per cassa. **Va validato con numeri reali prima di promettere soglie gratuite (§5).**
3. **Quality/consistenza dei personaggi** — rischio prodotto n.1 della generazione AI (parte del punto precedente).

**Orizzonte strutturale (lungo termine) — resta il più grande:**
- **Layer pagamenti/regolatorio** (gap store esterni → royalty, DAC7, IVA, PSD2, editore ISBN). È **strutturale** (non si risolve con codice) e **binario** (senza soluzione, il business non è legalmente operativo al primo euro di royalty). Posticipato, ma **non dimenticato**: va ripreso (con consulenza legale/fiscale) prima dell'onboarding del primo creator pagato.

**Rischio trasversale — copyright delle tavole AI.** Per opere a pubblicazione commerciale la proteggibilità delle tavole AI è zona grigia (US Copyright Office; AI Act UE). Posizionamento coerente (§3.6): **AI = prototipazione/storyboard, non opera finale**; documentare il contributo umano; monitorare la normativa.

---

## 2. Decisioni architetturali (v2)

| # | Decisione | Motivazione |
|---|-----------|-------------|
| D1 | Monorepo **pnpm workspaces + Turborepo** (`apps/web`, `apps/api`, `packages/shared`) | Vedi 1.1 |
| D2 | Backend **NestJS** (non Express puro) | DI + moduli per code, rate-limit, stratificazione dominio |
| D3 | Job queue **BullMQ su Redis**, worker separato; microservizio Python per ePub/PDF solo in fase editoriale | Vedi 1.3 |
| D4 | Progresso in tempo reale via **SSE** (fallback WebSocket) | Vedi 1.3 |
| D5 | **Pagamenti MVP = crediti single-payer** (Checkout semplice, Stripe Tax per IVA). Multi-party (Connect, fee, royalty, escrow) **posticipato** | Vedi 1.2 |
| D6 | **Modalità single-player** come percorso di valore primario (l'utente copre entrambi i ruoli) | Anti cold-start (§3.4) |
| D7 | **AI = prototipazione/storyboard**, non opera finale; tracciamento contributo umano | Coerenza copyright/IP (§3.6) |
| D8 | **Validazione prima del build** (Fase 0) + **metriche e kill criteria** definite ex-ante | §3.8, §5 |

---

## 3. Strategia commerciale (v2)

### 3.1 Verdetto
Mercato reale, pain autentico. Il piano originale monetizzava l'anello più debole (fee one-shot + royalty store esterni) e sottovalutava i ricavi immediati: **crediti AI** e **commissione sul lavoro collaborativo**. Corretto in v2: MVP a UN ricavo primario.

### 3.2 Forze
- Mercato digital comics/webtoon in crescita; pain reale (incontro talenti, costi, tempi).
- Freemium AI = acquisizione + monetizzazione immediata che copre i costi marginali.

### 3.3 Cuneo vs moat (corretto)
- **Wedge (canale di lancio):** tool AI + workspace come acquisizione; matchmaking come esito. La nicchia IT/EU è canale, non difesa.
- **Moat candidati (onesti):** (1) grafo community + dati dei creator, (2) stile/consistency addestrato per-creator (lock-in della risorsa), (3) pipeline integrata tool→publish. La consistency AI è una **finestra temporale**, non un fossato eterno.

### 3.4 Il fix del cold start: modalità single-player
Il tool deve dare valore a **un singolo creatore** senza bisogno del partner. "Lavoro da solo = copro writer e illustrator" non è un caso limite ma la leva centrale: cresci un lato alla volta, eviti il sincronismo domanda/offerta.

### 3.5 Monetizzazione: UN ricavo primario
- **MVP:** solo **crediti AI** (single-payer).
- **Ipotesi post-MVP (con trigger):** abbonamento "Studio" (trigger: ritenzione dimostrata dai pro); serializzazione/coins (trigger: serializzazione con engagement); print-on-demand (trigger: opere complete); pay-for-hire/escrow (trigger: dopo lo studio sui pagamenti multi-party). fee €19,99 e royalty: rivalutare/spacchettare quando si riprende il layer editoriale.

### 3.6 Copyright ↔ IP (coerenza)
Il valore IP si accumula sulle **opere rifinite dagli umani**; i bozzetti AI sono work-product non registrabile. La pipeline IP/opzioni (adattamenti audiovisivi, il vero upside economico) è applicabile solo alle opere finali con contributo umano documentato — e solo quando il quadro legale sull'AI lo consente.

### 3.7 Nicchia ed espansione
Rampa Italia (Lucca Comics & Games, ARF!, Napoli Comicon, scuole di fumetto) → espansione paneuropea Spagna/Francia/Germania. Il mercato IT serve da proof, non da tetto.

### 3.8 Validazione prima del build
Prima di codice: 10-20 interviste (metà sceneggiatori, metà disegnatori), landing page con demo finta + raccolta email, concierge test (servizio manuale per 5 utenti). Costa settimane, decide se il cuneo è giusto.

### 3.9 Metriche e criteri di kill — vedi §5.

---

## 4. Roadmap MVP (v2)

- **Fase 0 — Validazione:** interviste, landing + smoke test, concierge. *Gate: passare a Fase 1 solo con segnale di domanda.*
- **Fase 1 — MVP single-player:** monorepo, modello `User` unico, auth, tool storyboard AI con **consistenza personaggi** (character sheet/LoRA per progetto), rate limiting Redis, **crediti single-payer** (Checkout semplice). BullMQ + worker, SSE.
- **Fase 2 — Community minima:** profili/portfolio, "scoperta" dei creator, ruolo singolo/team (solo ⇒ writer_id = illustrator_id).
- **Fase 3 — Workspace di co-creazione:** matching, progetto condiviso, chat interna, assegnazione ruoli.
- **Fase 4 — (posticipata) Layer editoriale/pagamenti multi-party:** studio normativo (DAC7/IVA/PSD2/ISBN), poi fee, Connect, royalty, tesoreria store esterni, ePub/PDF.

**Esplicitamente FUORI dall'MVP:** Stripe Connect, fee editoriale, royalty split, pay-for-hire/escrow, distribuzione store esterni, ISBN, contratti digitali firmati, generazione ePub/PDF finale.

---

## 5. Metriche e criteri di kill (definiti ex-ante)

- **North star:** numero di opere complete pubblicate (proxy a lungo termine); per l'MVP: **attivazione single-player** (creator che genera la prima tavola in autonomia).
- **Attivazione:** % iscritti che generano la prima tavola entro 7 giorni.
- **Ritenzione:** % creator attivi a settimana (target da definire dopo le interviste di Fase 0).
- **Qualità AI:** accettazione media delle generazioni (quante tavole vengono tenute vs scartate) — proxy della consistenza personaggi.
- **Unit economics AI:** gross margin per utente attivo = ricavo crediti − costo generazione. **È il gate decisivo** del freemium.
- **Kill criteria:** se dopo N settimane (N = da fissare dopo la validazione) l'attivazione è sotto soglia O il gross margin per active è negativo strutturalmente, rivedere cuneo o modello.

---

## 6. Checklist prossimi passi (ordine di esecuzione)

- [ ] **Fase 0:** definire e condurre 10-20 interviste (sceneggiatori + disegnatori)
- [ ] **Fase 0:** landing page di test + raccolta email (smoke test)
- [ ] **Fase 0:** scegliere provider immagini e stimare costo reale per immagine (self-host vs API) → gate unit economics
- [ ] Fissare soglie gratuite e prezzi crediti SOLO dopo il dato di costo/immagine
- [ ] Definire schema Zod condiviso `User`/`Project` in `packages/shared`
- [ ] Spike BullMQ + worker minimale per generazione immagini
- [ ] (Riprendere, non ora) studio normativo multi-party: DAC7, IVA, PSD2, ISBN, contratti-tipo

---

## 7. Verdetto finale — "è tutto a posto?"

**Non in senso assoluto, e sarebbe disonesto dirlo.** Ma sì nel senso che conta per pianificare: il piano è ora **internamente coerente, senza contraddizioni** (pagamenti delimitati, scope ridotto, cold start affrontato, metriche ex-ante).

Quello che resta **non si risolve pianificando di più**, ma solo con dati e decisioni reali:
1. **Validazione (Fase 0)** → decide se il cuneo è giusto.
2. **Unit economics AI (costi reali/immagine)** → decide se il freemium è solvibile.
3. **Forza lavoro (team)** → decide cosa tagliare ancora dall'MVP.

**Stato:** pronto per eseguire Fase 0 e 1. I rischi residui sono rischi di **esecuzione**, non di pianificazione.

---

*Documento in evoluzione: aggiornare al termine della Fase 0 (validazione) e quando si riprende il layer editoriale/pagamenti.*