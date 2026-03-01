# Architecture

## Vue d'ensemble

PageNab est une extension Chrome (Manifest V3) qui capture le contexte complet d'une page web et le met dans le presse-papier (texte + image), pret a coller dans n'importe quel assistant AI.

```
┌─────────────────────────────────────────────────────┐
│                    Chrome Browser                    │
│                                                     │
│  ┌──────────────┐  ┌────────────────────────────┐  │
│  │    Popup      │  │      Content Script         │  │
│  │  (React UI)   │  │  ┌────────┐ ┌───────────┐ │  │
│  │               │  │  │  DOM   │ │  Console   │ │  │
│  │  [Capture]    │  │  │Extract │ │  Capture   │ │  │
│  │  [History]    │  │  ├────────┤ ├───────────┤ │  │
│  │  [Settings]   │  │  │Network │ │ Metadata   │ │  │
│  │               │  │  │Capture │ │ Collector  │ │  │
│  └──────┬───────┘  │  ├────────┤ ├───────────┤ │  │
│         │          │  │Cookies │ │ Storage    │ │  │
│         │          │  │Capture │ │ Capture    │ │  │
│         │          │  ├────────┤ ├───────────┤ │  │
│         │          │  │  Perf  │ │Interactions│ │  │
│         │          │  │Metrics │ │ Tracker*   │ │  │
│         │          │  ├────────┤ └───────────┘ │  │
│         │          │  │  Area  │                 │  │
│         │          │  │Selector│                 │  │
│         │          │  └────┬───┘                 │  │
│         │          └───────┼────────────────────┘  │
│         │                  │                        │
│  ┌──────▼──────────────────▼─────────────────────┐  │
│  │          Background Service Worker             │  │
│  │                                                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Capture  │ │ Format   │ │  Clipboard    │  │  │
│  │  │Orchestr. │→│Generator │→│  Writer       │  │  │
│  │  └──────────┘ └──────────┘ │ (text+image)  │  │  │
│  │       │                    └──────────────┘  │  │
│  │  ┌────▼─────┐  ┌───────────┐                  │  │
│  │  │Screenshot│  │ History   │                  │  │
│  │  │Downloader│  │ Manager   │                  │  │
│  │  └──────────┘  └───────────┘                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

* Interactions Tracker = content script persistant, uniquement si active
```

## Composants detailles

### 1. Content Script (on-demand)

**Responsabilite** : collecte des donnees depuis la page web active.

Injecte dans la page quand l'utilisateur declenche une capture. N'est PAS injecte en permanence (activation on-demand via `chrome.scripting.executeScript`).

**Modules** :
- `dom.ts` : Clone et nettoie le DOM (retire scripts inline, preserve styles, masque passwords)
- `console.ts` : Intercepte `console.*` via monkey-patching temporaire + collecte les erreurs existantes via `window.onerror` et `window.onunhandledrejection`
- `network.ts` : Utilise `PerformanceObserver` (type `resource`) + `performance.getEntriesByType('resource')` pour les requetes echouees/lentes
- `cookies.ts` : Lit `document.cookie` (non-httpOnly uniquement), sanitise les valeurs sensibles
- `storage.ts` : Lit `localStorage` et `sessionStorage`, sanitise les cles sensibles, tronque les valeurs longues
- `performance.ts` : Collecte `performance.getEntriesByType('navigation')`, `PerformanceObserver` (LCP, CLS, FID), `performance.memory`
- `metadata.ts` : Collecte URL, titre, viewport, userAgent, timestamp, langue, colorScheme
- `area-selector.ts` : Injecte un overlay semi-opaque, gere le click+drag pour dessiner un rectangle, retourne les coordonnees de la zone

**Contraintes** :
- Pas d'acces au `chrome.devtools` depuis un content script — utilise les API web standard
- Execution ephemere : injecte, collecte, envoie au background, se retire
- Pas de modification permanente du DOM de la page (l'overlay area est temporaire)
- Chaque module n'est appele que si le preset l'exige

### 2. Content Script (persistent) — Interactions Tracker

**Responsabilite** : enregistrer les dernieres interactions utilisateur (clics, scrolls, inputs) dans un buffer circulaire.

**Activation** : enregistre via `chrome.scripting.registerContentScripts` UNIQUEMENT quand le tracking interactions est actif (preset Full ou Custom avec interactions coche). Desenregistre quand desactive.

**Comportement** :
- Buffer circulaire de 50 evenements max
- Ecoute : `click`, `scroll`, `input`, `change`
- Sanitize : les valeurs des inputs sont TOUJOURS masquees (`***`)
- Seuls le type d'element, classes CSS, et ID sont enregistres
- Pas de capture de frappes clavier individuelles
- Quand la capture est declenchee, le background demande le buffer au content script via messaging

**Impact quand desactive** : zero — pas de script persistant, pas d'evenement ecoute.

### 3. Background Service Worker

**Responsabilite** : orchestration de la capture, clipboard multi-format, sauvegarde screenshot, gestion historique.

**Modules** :
- `capture.ts` : Coordonne la collecte (screenshot via `chrome.tabs.captureVisibleTab`, donnees du content script via messaging, crop area via canvas offscreen). Determine les modules a appeler selon le preset.
- `clipboard.ts` : Ecrit dans le clipboard en multi-format (`text/plain` + `image/png`) via offscreen document + `navigator.clipboard.write`
- `history.ts` : Sauvegarde/lecture/suppression des captures dans `chrome.storage.local`, gestion de la limite max

**Flow de capture — Full Page** :
```
1. Utilisateur declenche capture (popup click / raccourci clavier)
2. Background determine le preset actif (Light/Full/Custom) et les donnees a capturer
3. Background injecte le content script dans l'onglet actif
4. Content script collecte les donnees requises par le preset
5. Si interactions actif : background demande le buffer au content script persistant
6. Content script envoie les donnees au background
7. Background capture le screenshot via chrome.tabs.captureVisibleTab
8. Background assemble le CaptureBundle complet
9. Background sauvegarde le screenshot via chrome.downloads (persistance)
10. Background copie dans le clipboard via offscreen document :
    - text/plain : donnees textuelles formatees selon le preset
    - image/png : screenshot pleine page
11. Background sauvegarde la capture dans l'historique (chrome.storage.local)
12. Notification de succes
```

**Flow de capture — Area** :
```
1. Utilisateur selectionne mode "Area" et clique "Nab" (ou raccourci si dernier mode = area)
2. Si popup ouvert : popup se ferme
3. Background injecte le content script avec l'overlay area-selector
4. Overlay semi-opaque apparait, curseur crosshair, barre instructions en bas
5. Utilisateur dessine un rectangle (click + drag), ou Esc pour annuler
6. Content script capture les coordonnees + donnees selon le preset
7. Background capture le screenshot full page via captureVisibleTab
8. Background crop la zone selectionnee (canvas offscreen)
9. Background sauvegarde les deux screenshots (full + area) via chrome.downloads
10. Background copie dans le clipboard :
    - text/plain : donnees textuelles (mentionne les deux fichiers)
    - image/png : screenshot de la zone selectionnee (plus pertinent)
11. Suite identique (historique, notification)
```

### 4. Clipboard multi-format

**Principe** : le presse-papier contient deux formats simultanement via `ClipboardItem` :

```javascript
const clipboardItem = new ClipboardItem({
  'text/plain': new Blob([textData], { type: 'text/plain' }),
  'image/png': screenshotBlob
})
await navigator.clipboard.write([clipboardItem])
```

**Comportement au collage** :

| Outil | Ce qui se passe |
|-------|----------------|
| **Claude Code (CLI)** | Le texte se colle comme input + l'image s'attache (comme un screenshot natif Cmd+Shift+4) |
| **Claude.ai (web)** | Texte + image apparaissent dans le message |
| **ChatGPT (web)** | Texte + image dans le message |
| **Cursor (IDE)** | Texte + image dans le contexte |

C'est le meme comportement que coller un screenshot natif, avec le texte en bonus.

**En mode area** : l'image dans le clipboard est le screenshot de la zone (plus pertinent que la page entiere). Les chemins des deux fichiers (full + area) sont dans le texte.

### 5. Popup (React UI)

**Responsabilite** : interface utilisateur complete.

**Ecrans** :
- **Capture** (defaut) : switches screenshot mode (full page/area) + preset (Light/Full/Custom), checkboxes donnees (si Custom), bouton "Nab this page", derniere capture, hint raccourci
- **History** : liste scrollable des captures passees, actions copy/details/delete, compteur stockage
- **History Detail** : vue detaillee d'une capture (screenshot, console, network, DOM, cookies, storage, interactions, perf), bouton re-copy
- **Settings** : notifications on/off, raccourci clavier (enregistreur de touches), max captures historique

**Navigation** : header avec icone retour (←) sur les sous-pages, icones history (🕓) et settings (⚙️) sur l'ecran principal.

## Presets

Le systeme de presets controle quelles donnees sont capturees :

| Donnee | Light | Full | Custom |
|--------|-------|------|--------|
| Screenshot | toujours | toujours | toujours |
| Metadata | toujours | toujours | toujours |
| Console | Errors + warnings | All levels | Configurable |
| Network | Failed only | Failed + slow | Configurable |
| DOM | Non | Oui | Configurable |
| Cookies | Non | Oui (sanitises) | Configurable |
| Storage | Non | Oui | Configurable |
| Interactions | Non | Oui | Configurable |
| Performance | Non | Oui | Configurable |

En Custom, Console et Network sont coches par defaut.

## Decisions techniques

### Pourquoi Plasmo ?

| Alternative | Raison du rejet |
|-------------|----------------|
| WXT | Plasmo a un ecosysteme plus large, meilleure doc, HMR natif |
| Chrome API raw | Trop verbeux, pas de hot reload, pas de React natif |
| Webpack/Vite custom | Maintenance lourde pour le bundling extension |

### Pourquoi chrome.downloads pour la persistance ?

Les screenshots sont copies dans le clipboard (pour le collage immediat) ET sauvegardes dans Downloads (pour la persistance). Le download sert de backup :
- Si le clipboard est ecrase avant le collage
- Pour re-copier depuis l'historique (l'image originale est dans Downloads)
- Pour les outils CLI qui veulent lire le fichier par chemin

### Pourquoi le clipboard multi-format ?

L'image s'attache directement quand on colle, comme un screenshot natif (Cmd+Shift+4). Le texte fournit le contexte structure en plus. L'utilisateur n'a rien a faire de special — il colle et l'AI recoit tout.

### Raccourci clavier custom

Gere par un systeme custom (pas `chrome.commands`) pour permettre la personnalisation dans les settings :
- L'enregistreur de touches capture la combinaison dans Settings
- Le raccourci est stocke dans `chrome.storage.local`
- Un content script leger ecoute les evenements clavier
- Avantage : modification sans passer par `chrome://extensions/shortcuts`

### Pourquoi un content script persistant pour les interactions ?

Les interactions utilisateur (clics, scrolls, inputs) doivent etre enregistrees AVANT que la capture soit declenchee. Le content script on-demand ne peut pas capturer des evenements passes. Solution :
- Un content script persistant enregistre via `chrome.scripting.registerContentScripts`
- Active uniquement quand le preset le requiert (Full ou Custom+interactions)
- Desactive = zero impact, pas de script injecte
- Buffer circulaire de 50 events, pas de fuite memoire

## Securite

### Donnees sensibles

1. **Sanitization reseau** : headers retires (Authorization, Cookie, Set-Cookie, X-API-Key, X-Auth-Token, headers contenant "token"/"key"/"secret"/"password")
2. **Sanitization DOM** : valeurs des inputs `type="password"` remplacees par `***`
3. **Sanitization cookies** : valeurs tronquees a 20 chars, cookies sensibles (token/session/auth/key/secret/password dans le nom) entierement masques
4. **Sanitization storage** : cles sensibles masquees, valeurs tronquees a 200 chars
5. **Sanitization interactions** : valeurs d'inputs TOUJOURS masquees, pas de frappes clavier individuelles
6. **Stockage local uniquement** : aucune donnee ne transite par un serveur

### Permissions Chrome

```json
{
  "permissions": [
    "activeTab",
    "clipboardWrite",
    "storage",
    "downloads",
    "notifications"
  ]
}
```

Pas de `<all_urls>`, pas de `tabs`, pas de `history`, pas de `cookies` (on utilise `document.cookie` depuis le content script), pas de `nativeMessaging`.

## Scope V2 (futur)

- **Element Selector** : selection visuelle basee sur le DOM (highlight au survol), capture sous-arbre + screenshot crop
- **Native Messaging Host** : ecriture dans `~/.pagenab/` avec rotation, symlink `latest`
- **MCP Server** : package `pagenab-mcp` pour exposer les captures comme outils MCP
- **Locators Playwright** : generation automatique de locators
