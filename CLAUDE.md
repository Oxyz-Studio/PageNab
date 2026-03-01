# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository (`Oxyz-Studio/PageNab`).

## Projet

**PageNab** est une extension Chrome open source (MIT) qui capture le contexte complet d'une page web (screenshot, DOM, console, network, locators Playwright) et le formate en prompt pret a coller dans n'importe quel assistant AI (Claude Code, Cursor, Windsurf, Copilot).

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

# MCP Server (optionnel)
npm run mcp:dev          # Dev MCP server local
npm run mcp:build        # Build MCP server

# Tests
npm run test             # Tests unitaires (Vitest)
npm run test:e2e         # Tests E2E extension (Playwright)
```

## Architecture

### Composants

```
Extension Chrome (Plasmo, Manifest V3)
├── Background Service Worker    → Orchestration capture, stockage fichiers
├── Content Script               → Injection page, selection element, extraction DOM/console/network
├── Popup                        → UI rapide (bouton capture, settings)
├── Side Panel (optionnel)       → Preview de la capture avant copie
└── Native Messaging Host        → Ecriture fichiers locaux (~/.pagenab/)

MCP Server (optionnel, package npm separe)
└── stdio server                 → Expose les captures comme outils MCP
```

### Data Flow

```
1. Utilisateur clique PageNab (ou Ctrl+Shift+N)
2. Content Script capture : screenshot (chrome.tabs.captureVisibleTab),
   console logs (devtools protocol), network errors (Performance API),
   DOM (document.documentElement.outerHTML), locators Playwright (generation)
3. Background SW recoit les donnees, les structure en capture bundle
4. Native Messaging Host ecrit les fichiers dans ~/.pagenab/captures/{timestamp}_{domain}/
5. Background SW genere le prompt (resume inline + chemins fichiers)
6. Prompt copie dans le clipboard (navigator.clipboard.writeText)
7. Notification utilisateur "Captured! Paste in your AI assistant."
```

### Layout du code

```
src/
├── background/          → Service worker (orchestration, storage, clipboard)
│   ├── index.ts         → Message handler principal
│   ├── capture.ts       → Orchestration de la capture
│   ├── storage.ts       → Gestion fichiers locaux + rotation
│   └── clipboard.ts     → Generation du prompt + copie clipboard
├── content/             → Content scripts (injectes dans la page)
│   ├── index.ts         → Point d'entree content script
│   ├── dom.ts           → Extraction DOM snapshot
│   ├── console.ts       → Capture console logs
│   ├── network.ts       → Capture network errors
│   ├── locators.ts      → Generation locators Playwright
│   └── selector.ts      → Mode selection d'element (highlight rainbow)
├── popup/               → UI popup extension
│   ├── index.tsx         → Popup React component
│   └── Settings.tsx      → Page settings
├── native-host/         → Native Messaging Host (Node.js)
│   └── index.ts         → Ecriture fichiers locaux
├── mcp/                 → MCP Server optionnel
│   └── server.ts        → Serveur MCP stdio
├── lib/                 → Utilitaires partages
│   ├── types.ts         → Types TypeScript (CaptureBundle, etc.)
│   ├── format.ts        → Formatage du prompt clipboard
│   ├── sanitize.ts      → Nettoyage donnees sensibles
│   └── config.ts        → Configuration par defaut
└── assets/              → Icones, images
```

## Stack

Plasmo (Manifest V3) | React 19 | TypeScript | Tailwind CSS 4 | Vitest | Playwright (tests E2E)

## Conventions

- **TypeScript strict** : pas de `any`, utiliser `unknown`
- **Fichiers** : composants `PascalCase.tsx`, utilitaires `camelCase.ts`
- **Messages Chrome** : typage strict avec discriminated unions
- **Permissions** : minimum necessaire (`activeTab`, `clipboardWrite`, `storage`, `nativeMessaging`)
- **Pas de remote code** : tout est bundle (Manifest V3)
- **Sanitization** : toujours nettoyer les headers sensibles (Authorization, Cookie, Set-Cookie) des captures network
- **Taille** : chaque capture doit rester sous 5MB total

## Regles critiques

1. Toujours sanitizer les donnees sensibles avant ecriture (headers auth, cookies, tokens)
2. Jamais de requete reseau depuis l'extension (tout est local)
3. Toujours respecter la rotation du stockage (max captures, max age, max size)
4. Le prompt clipboard doit toujours inclure le resume inline + les chemins fichiers
5. Permissions Chrome minimales — `activeTab` pas `<all_urls>`
6. Pas de tracking, pas d'analytics, pas de telemetrie
7. Le symlink `latest` doit toujours pointer sur la derniere capture
8. Les locators Playwright doivent privilegier `getByRole` > `getByTestId` > `getByText` > CSS selector
9. Le DOM snapshot doit etre nettoye (scripts inline retires, styles inline preserves)
10. L'extension doit fonctionner hors-ligne (aucune dependance reseau)

## Capture Bundle Format

Chaque capture produit un dossier :
```
{timestamp}_{domain}/
├── screenshot.png        → chrome.tabs.captureVisibleTab (pleine page)
├── element.png           → Screenshot de l'element selectionne (optionnel)
├── console.json          → { logs: [{ level, message, source, line, stack, timestamp }] }
├── network.json          → { requests: [{ url, method, status, statusText, type, timing, error }] }
├── dom.html              → HTML nettoye du document ou de l'element selectionne
├── locators.json         → { locators: [{ action, selector, selectorType, elementInfo }] }
└── metadata.json         → { url, title, timestamp, viewport, userAgent, captureVersion }
```

## Documentation

Consulter `docs/` pour les specs completes :
- `ARCHITECTURE.md` : architecture detaillee, composants, decisions techniques
- `CAPTURE_FORMAT.md` : specification complete du format de capture
- `STORAGE.md` : gestion du stockage local, rotation, limites
- `MCP_SERVER.md` : specification du serveur MCP optionnel
- `CHROME_STORE.md` : guide de publication Chrome Web Store
- `PROMPT_FORMAT.md` : specification du format de prompt clipboard
- `PRIVACY.md` : politique de confidentialite, donnees collectees

## Etat du projet

**Phase actuelle : Documentation terminee, code non commence.**

Le repository ne contient que de la documentation. Le design system sera importe depuis le projet OSAIT avant de commencer l'implementation.

**Prochaine etape** : importer le design system OSAIT, puis commencer l'implementation.
