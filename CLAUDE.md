# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository (`Oxyz-Studio/PageNab`).

## Projet

**PageNab** est une extension Chrome open source (MIT) qui capture le contexte complet d'une page web (screenshot, DOM, console, network, cookies, storage, interactions, performance) et le met dans le presse-papier, pret a coller dans n'importe quel assistant AI (Claude Code, Cursor, Windsurf, Copilot).

Un clic. Contexte complet. Coller et c'est parti.

**Lien avec OSAIT** : PageNab est le produit gratuit/open source d'acquisition pour le SaaS OSAIT (osait.fr). L'extension fonctionne en standalone mais pourra a terme envoyer des captures directement a OSAIT pour un traitement automatise (fix AI + PR GitHub).

## Commandes

```bash
# Dev
npm run dev              # Dev extension (hot reload via Plasmo)
npm run build            # Build production
npm run zip              # Package .zip pour Chrome Web Store
npm run lint             # ESLint + Prettier
npm run typecheck        # TypeScript strict

# Tests
npm run test             # Tests unitaires (Vitest)
```

## Architecture

### Composants

```
Extension Chrome (Plasmo, Manifest V3)
├── Background Service Worker    → Orchestration capture, clipboard multi-format, download screenshot
├── Content Script (on-demand)   → Injection page, extraction DOM/console/network/cookies/storage/perf, overlay area selection
├── Content Script (persistent)  → Tracking interactions utilisateur (uniquement si active)
├── Popup                        → UI (capture, presets, history, settings)
└── Offscreen Document           → Clipboard write (navigator.clipboard.write avec text + image)
```

### Data Flow

```
Flow full page :
1. Utilisateur clique "Nab this page" ou raccourci clavier
2. Background injecte le content script dans l'onglet actif
3. Content Script capture selon le preset : console, network, DOM, cookies, storage, perf, metadata
4. Content Script envoie les donnees au background
5. Background capture le screenshot via chrome.tabs.captureVisibleTab
6. Background assemble le CaptureBundle
7. Background sauvegarde le screenshot dans Downloads via chrome.downloads (persistance)
8. Background copie dans le clipboard : text/plain (donnees textuelles) + image/png (screenshot)
9. Background sauvegarde la capture dans l'historique (chrome.storage.local)
10. Notification "Captured! Paste in your AI assistant."
11. L'utilisateur colle → le texte ET l'image s'attachent directement (comme un screenshot natif)

Flow area :
1. Utilisateur selectionne mode "Area" et clique "Nab" (ou raccourci si dernier mode = area)
2. Popup se ferme, content script injecte un overlay semi-opaque
3. Utilisateur dessine un rectangle (click + drag), Esc pour annuler
4. Content script capture les coordonnees de la zone + donnees selon le preset
5. Background capture le screenshot full page via captureVisibleTab
6. Background crop la zone selectionnee (canvas)
7. Background sauvegarde les deux screenshots (full + area) via chrome.downloads
8. Background copie dans le clipboard : text/plain + image/png (area screenshot)
9. Suite identique (historique, notification)
```

### Clipboard multi-format

Le presse-papier contient simultanement deux formats :
- `text/plain` : donnees textuelles (metadata, console, network, cookies, storage, perf, chemin screenshots, DOM optionnel)
- `image/png` : screenshot (full page ou area selon le mode)

Quand l'utilisateur colle :
- **Claude Code (CLI)** : le texte se colle + l'image s'attache directement (comme un screenshot natif)
- **Claude.ai / ChatGPT (web)** : texte + image apparaissent dans le message
- **Cursor / Windsurf (IDE)** : texte + image dans le contexte

### Layout du code

```
src/
├── background/          → Service worker (orchestration, clipboard, downloads)
│   ├── index.ts         → Message handler principal
│   ├── capture.ts       → Orchestration de la capture (full page + area)
│   ├── clipboard.ts     → Copie multi-format (text/plain + image/png)
│   └── history.ts       → Gestion historique captures (chrome.storage.local)
├── content/             → Content scripts (injectes dans la page)
│   ├── index.ts         → Point d'entree content script (on-demand)
│   ├── dom.ts           → Extraction DOM snapshot
│   ├── console.ts       → Capture console logs
│   ├── network.ts       → Capture network errors
│   ├── cookies.ts       → Capture cookies (document.cookie, sanitise)
│   ├── storage.ts       → Capture localStorage/sessionStorage
│   ├── performance.ts   → Capture metriques performance (CWV, timings)
│   ├── interactions.ts  → Tracking interactions utilisateur (content script persistant)
│   ├── metadata.ts      → Collection metadata page
│   └── area-selector.ts → Overlay selection zone rectangulaire
├── popup/               → UI popup extension
│   ├── index.tsx        → Popup React component (ecran principal)
│   ├── History.tsx      → Liste des captures precedentes
│   ├── HistoryDetail.tsx → Detail d'une capture
│   └── Settings.tsx     → Page settings
├── lib/                 → Utilitaires partages
│   ├── types.ts         → Types TypeScript (CaptureBundle, Preset, etc.)
│   ├── format.ts        → Formatage des donnees textuelles pour le clipboard
│   ├── sanitize.ts      → Nettoyage donnees sensibles
│   └── config.ts        → Configuration par defaut, presets
└── assets/              → Icones, images
```

## Stack

Plasmo (Manifest V3) | React 19 | TypeScript | Tailwind CSS 4 | Vitest

## Conventions

- **TypeScript strict** : pas de `any`, utiliser `unknown`
- **Fichiers** : composants `PascalCase.tsx`, utilitaires `camelCase.ts`
- **Messages Chrome** : typage strict avec discriminated unions
- **Permissions** : minimum necessaire (`activeTab`, `clipboardWrite`, `storage`, `downloads`, `notifications`)
- **Pas de remote code** : tout est bundle (Manifest V3)
- **Sanitization** : toujours nettoyer les headers sensibles, valeurs de cookies, valeurs d'inputs utilisateur
- **Taille** : chaque capture dans l'historique doit rester raisonnable (~100-250KB avec thumbnail)

## Regles critiques

1. Toujours sanitizer les donnees sensibles avant ecriture (headers auth, cookies, tokens, valeurs d'inputs)
2. Jamais de requete reseau depuis l'extension (tout est local)
3. Le clipboard contient toujours text/plain + image/png (multi-format)
4. Permissions Chrome minimales — `activeTab` pas `<all_urls>`
5. Pas de tracking, pas d'analytics, pas de telemetrie
6. Le DOM snapshot doit etre nettoye (scripts inline retires, styles inline preserves)
7. L'extension doit fonctionner hors-ligne (aucune dependance reseau)
8. Le screenshot est aussi sauvegarde dans Downloads via chrome.downloads (persistance)
9. Zero friction a l'installation : installer le plugin = pret a capturer
10. En mode area, toujours capturer le full page en plus de la zone selectionnee
11. L'historique respecte la limite max configurable (defaut 20 captures)
12. Le content script persistent (interactions) n'est enregistre QUE quand le tracking est actif (Full preset ou Custom avec interactions coche)

## Presets de capture

### Light (defaut)

Capture legere : screenshot + metadata + console errors/warnings + network failed.

Le clipboard contient :
- **image/png** : le screenshot
- **text/plain** : metadata + console (errors + warnings) + network (failed only) + chemin screenshots

~200-500 tokens de texte + image attachee. Ideal pour la majorite des cas.

### Full

Capture complete : screenshot + metadata + console (all levels) + network (failed + slow) + DOM + cookies + storage + interactions + performance.

Le clipboard contient :
- **image/png** : le screenshot
- **text/plain** : metadata + console (all) + network (failed + slow) + DOM + cookies + storage + interactions + performance + chemin screenshots

~1.5K-150K tokens de texte + image attachee. Pour les bugs complexes necessitant un maximum de contexte.

### Custom

L'utilisateur choisit exactement quelles donnees capturer via des checkboxes :
- Console (defaut: ON)
- Network (defaut: ON)
- DOM
- Cookies
- Storage (localStorage/sessionStorage)
- Interactions (derniers evenements utilisateur)
- Performance (Core Web Vitals, timings)

### Note importante

Les trois presets capturent TOUJOURS le screenshot et les metadata. La difference est dans les donnees conditionnelles incluses. L'historique stocke toujours toutes les donnees capturees, et la vue Details permet de tout consulter.

## Capture Bundle

Chaque capture produit :
```
screenshot (PNG)      → clipboard image/png + Downloads (persistance)
area screenshot (PNG) → clipboard image/png (si area) + Downloads
metadata              → { url, title, timestamp, viewport, userAgent, preset, capturedData, ... }
console               → { summary, logs: [...] } (Light: errors+warnings | Full: all)
network               → { summary, failed: [...], slow: [...] } (Light: failed only | Full: failed+slow)
dom                   → HTML nettoye (Full/Custom uniquement)
cookies               → { summary, cookies: [...] } sanitise (Full/Custom uniquement)
storage               → { localStorage, sessionStorage } sanitise (Full/Custom uniquement)
interactions          → { summary, events: [...] } (Full/Custom uniquement)
performance           → { loadTime, LCP, CLS, FID, memory, ... } (Full/Custom uniquement)
```

## Scope V1 vs V2

### V1 (actuel)
- Capture : screenshot (full page + area) + metadata + console + network + DOM + cookies + storage + interactions + perf
- Presets : Light (minimal), Full (tout), Custom (au choix)
- Clipboard : multi-format text/plain + image/png (l'image s'attache directement au collage)
- Screenshot : aussi sauvegarde via chrome.downloads pour persistance
- UI : popup avec presets, switches, history, settings
- Raccourci clavier : capture directe, respecte le dernier mode, configurable dans settings
- Historique : captures stockees dans chrome.storage.local, copy/details/delete
- Tests : unitaires Vitest
- Zero friction : installer = pret a capturer

### V2 (futur)
- Element selector : selection visuelle d'un element specifique (highlight DOM)
- MCP Server : package npm `pagenab-mcp` pour Claude Code / Cursor
- Native Messaging Host : ecriture fichiers dans `~/.pagenab/` pour power users
- Stockage local avec rotation automatique
- Locators Playwright
- Tests E2E

## Documentation

Consulter `docs/` pour les specs completes :
- `ARCHITECTURE.md` : architecture detaillee, composants, decisions techniques
- `CAPTURE_FORMAT.md` : specification complete du format de capture (presets, donnees, sanitization)
- `CLIPBOARD_FORMAT.md` : specification du format clipboard (texte + image)
- `WIREFRAMES.md` : wireframes textuels de tous les ecrans du popup
- `STORAGE.md` : gestion du stockage (chrome.storage.local + chrome.downloads)
- `IMPLEMENTATION_STEPS.md` : guide d'implementation sequentiel (10 etapes)
- `MCP_SERVER.md` : specification du serveur MCP (V2)
- `CHROME_STORE.md` : guide de publication Chrome Web Store
- `PRIVACY.md` : politique de confidentialite, donnees collectees

## Etat du projet

**Phase actuelle : Documentation terminee, code non commence.**

Le repository ne contient que de la documentation.

**Prochaine etape** : commencer l'implementation (Etape 1 : Scaffolding). Design neutre avec Tailwind CSS.
