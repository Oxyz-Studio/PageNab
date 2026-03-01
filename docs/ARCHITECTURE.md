# Architecture

## Vue d'ensemble

PageNab est une extension Chrome (Manifest V3) qui capture le contexte complet d'une page web et le rend disponible pour n'importe quel assistant AI via le clipboard et le systeme de fichiers local.

```
┌─────────────────────────────────────────────────────┐
│                    Chrome Browser                    │
│                                                     │
│  ┌──────────────┐  ┌────────────────────────────┐  │
│  │    Popup      │  │      Content Script         │  │
│  │  (React UI)   │  │  ┌────────┐ ┌───────────┐ │  │
│  │               │  │  │  DOM   │ │  Console   │ │  │
│  │  [Capture]    │  │  │Extract │ │  Capture   │ │  │
│  │  [Settings]   │  │  ├────────┤ ├───────────┤ │  │
│  │               │  │  │Network │ │  Locators  │ │  │
│  └──────┬───────┘  │  │Capture │ │ Generator  │ │  │
│         │          │  ├────────┤ ├───────────┤ │  │
│         │          │  │Element │ │ Metadata   │ │  │
│         │          │  │Selector│ │ Collector  │ │  │
│         │          │  └────┬───┘ └─────┬─────┘ │  │
│         │          └───────┼───────────┼───────┘  │
│         │                  │           │           │
│  ┌──────▼──────────────────▼───────────▼────────┐  │
│  │          Background Service Worker            │  │
│  │                                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │  │
│  │  │ Capture  │ │ Prompt   │ │  Clipboard    │ │  │
│  │  │Orchestr. │→│Generator │→│  Writer       │ │  │
│  │  └────┬─────┘ └──────────┘ └──────────────┘ │  │
│  └───────┼──────────────────────────────────────┘  │
└──────────┼─────────────────────────────────────────┘
           │
    ┌──────▼──────────────┐
    │  Native Messaging   │
    │  Host (Node.js)     │
    │                     │
    │  Ecrit dans :       │
    │  ~/.pagenab/        │
    └─────────────────────┘
```

## Composants detailles

### 1. Content Script

**Responsabilite** : collecte des donnees depuis la page web active.

Injecte dans chaque page quand l'utilisateur declenche une capture. N'est PAS injecte en permanence (activation on-demand via `chrome.scripting.executeScript`).

**Modules** :
- `dom.ts` : Clone et nettoie le DOM (retire scripts inline, preserve styles)
- `console.ts` : Intercepte `console.*` via monkey-patching temporaire + collecte les erreurs existantes via `window.onerror` et `window.onunhandledrejection`
- `network.ts` : Utilise `PerformanceObserver` (type `resource`) + `performance.getEntriesByType('resource')` pour les requetes echouees
- `locators.ts` : Genere des locators Playwright (`getByRole`, `getByTestId`, `getByText`, CSS fallback) pour les elements interactifs
- `selector.ts` : Mode selection d'element avec highlight visuel (overlay CSS anime)
- `metadata.ts` : Collecte URL, titre, viewport, userAgent, timestamp, langue

**Contraintes** :
- Pas d'acces au `chrome.devtools` depuis un content script — utilise les API web standard
- Execution ephemere : injecte, collecte, envoie au background, se retire
- Pas de modification du DOM de la page (sauf overlay de selection temporaire)

### 2. Background Service Worker

**Responsabilite** : orchestration de la capture, generation du prompt, communication avec le Native Host.

**Modules** :
- `capture.ts` : Coordonne la collecte (screenshot via `chrome.tabs.captureVisibleTab`, donnees du content script via messaging)
- `storage.ts` : Gestion de la rotation (nombre, age, taille), communication avec le Native Host
- `clipboard.ts` : Genere le prompt structure et le copie via `chrome.offscreen` + `navigator.clipboard.writeText`
- `config.ts` : Lecture/ecriture des settings utilisateur via `chrome.storage.local`

**Flow de capture** :
```
1. Utilisateur declenche capture (popup click / keyboard shortcut / context menu)
2. Background injecte le content script dans l'onglet actif
3. Content script collecte : DOM, console, network, locators, metadata
4. Content script envoie les donnees au background via chrome.runtime.sendMessage
5. Background capture le screenshot via chrome.tabs.captureVisibleTab
6. Background assemble le CaptureBundle complet
7. Background envoie au Native Host pour ecriture fichiers
8. Background genere le prompt et copie dans le clipboard
9. Background affiche une notification de succes
```

### 3. Popup (React UI)

**Responsabilite** : interface utilisateur minimale.

**Pages** :
- **Capture** (defaut) : bouton "Nab this page", toggle selection d'element, preview rapide
- **Settings** : configuration stockage, format clipboard, raccourci clavier

**Design** : utilise le design system partage avec OSAIT (a importer).

### 4. Native Messaging Host

**Responsabilite** : ecriture des fichiers de capture sur le disque local.

Les extensions Chrome ne peuvent pas ecrire sur le systeme de fichiers. Le Native Messaging Host est un petit processus Node.js qui recoit les donnees via le protocole Native Messaging de Chrome et les ecrit dans `~/.pagenab/`.

**Installation** : script d'installation automatique qui :
1. Copie le binaire Node.js du host dans `~/.pagenab/host/`
2. Enregistre le manifest Native Messaging dans le repertoire Chrome (`~/.config/google-chrome/NativeMessagingHosts/` sur Linux, `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/` sur macOS)
3. Valide la connexion

**Alternative sans Native Host** : pour une installation simplifiee, PageNab peut fonctionner en mode "download" — les captures sont telechargees comme fichier .zip via `chrome.downloads`. Moins fluide mais zero installation supplementaire.

### 5. MCP Server (optionnel)

**Responsabilite** : expose les captures comme outils MCP pour Claude Code / Cursor.

Package npm separe (`pagenab-mcp`) qui tourne en stdio. Lit les fichiers depuis `~/.pagenab/` et les expose via le protocole MCP.

**Outils exposes** :
- `get_latest_capture` : retourne la derniere capture (metadata + contenu)
- `get_capture_screenshot` : retourne le screenshot en base64 (type image)
- `get_capture_console` : retourne les logs console
- `get_capture_network` : retourne les requetes reseau
- `get_capture_dom` : retourne le DOM snapshot
- `get_capture_locators` : retourne les locators Playwright
- `list_captures` : liste toutes les captures disponibles

## Decisions techniques

### Pourquoi Plasmo ?

| Alternative | Raison du rejet |
|-------------|----------------|
| WXT | Plasmo a un ecosysteme plus large, meilleure doc, HMR natif |
| Chrome API raw | Trop verbeux, pas de hot reload, pas de React natif |
| Webpack/Vite custom | Maintenance lourde pour le bundling extension |

Plasmo offre : hot reload, support React natif, TypeScript, build multi-navigateur, gestion automatique du manifest.

### Pourquoi Native Messaging plutot que chrome.downloads ?

| Critere | Native Messaging | chrome.downloads |
|---------|-----------------|-----------------|
| UX | Transparent (pas de popup "save") | Popup de telechargement |
| Chemin fichier | Controlable (`~/.pagenab/`) | Dossier Downloads |
| Symlink `latest` | Possible | Impossible |
| Rotation auto | Possible | Manuelle |
| Installation | Script supplementaire | Zero config |

Choix : Native Messaging par defaut, chrome.downloads en fallback.

### Pourquoi pas d'API reseau ?

PageNab est un outil local. Aucune donnee ne quitte la machine. Cela garantit :
- Privacy totale (pas de RGPD a gerer)
- Fonctionnement hors-ligne
- Pas de backend a maintenir
- Pas de cout serveur
- Confiance utilisateur maximale

### Pourquoi le prompt hybride (resume inline + chemins fichiers) ?

Voir `docs/PROMPT_FORMAT.md` pour l'analyse detaillee. En resume :
- Le resume inline donne le contexte critique immediatement (erreurs, URL)
- Les chemins fichiers permettent a l'AI de lire selectivement (economie de tokens)
- Les screenshots ne peuvent etre lus que via fichier (pas de collage image en terminal)
- Les donnees persistent meme si le contexte AI est compresse

## Securite

### Donnees sensibles

Les captures peuvent contenir des informations sensibles. PageNab applique :

1. **Sanitization reseau** : les headers suivants sont retires des captures network :
   - `Authorization`, `Cookie`, `Set-Cookie`
   - `X-API-Key`, `X-Auth-Token`
   - Headers custom contenant "token", "key", "secret", "password"

2. **Sanitization DOM** : les valeurs des inputs `type="password"` sont remplacees par `***`

3. **Pas de cookies** : PageNab ne capture PAS les cookies par defaut (contrairement a l'extension OSAIT qui en a besoin pour le replay Playwright)

4. **Stockage local uniquement** : aucune donnee ne transite par un serveur

### Permissions Chrome

```json
{
  "permissions": [
    "activeTab",
    "clipboardWrite",
    "storage",
    "nativeMessaging",
    "notifications"
  ]
}
```

- `activeTab` : acces a l'onglet actif uniquement quand l'utilisateur clique
- `clipboardWrite` : ecriture du prompt dans le clipboard
- `storage` : persistance des settings
- `nativeMessaging` : communication avec le Native Host
- `notifications` : feedback visuel apres capture

Pas de `<all_urls>`, pas de `tabs`, pas de `history`, pas de `cookies`.
