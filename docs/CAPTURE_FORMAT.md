# Capture Format Specification

## Vue d'ensemble

Chaque capture PageNab produit un ensemble de donnees structurees. Le contenu depend du preset choisi (Light, Full, Custom). Le screenshot et les metadata sont toujours captures.

## Presets

| Donnee | Light | Full | Custom |
|--------|-------|------|--------|
| Screenshot | ✓ (toujours) | ✓ (toujours) | ✓ (toujours) |
| Metadata | ✓ (toujours) | ✓ (toujours) | ✓ (toujours) |
| Console | Errors + warnings | All levels | Configurable |
| Network | Failed only | Failed + slow | Configurable |
| DOM | Non | Oui | Configurable |
| Cookies | Non | Oui (sanitises) | Configurable |
| LocalStorage / SessionStorage | Non | Oui | Configurable |
| User interactions | Non | Oui | Configurable |
| Performance metrics | Non | Oui | Configurable |

## Donnees toujours capturees

### screenshot (PNG)

Screenshot pleine page via `chrome.tabs.captureVisibleTab()`.

- Format : PNG
- Resolution : viewport reel de l'utilisateur
- Taille typique : 200KB - 1MB
- Destination : clipboard (image/png) + Downloads (persistance)
- Nommage Downloads : `pagenab-{domain}-{YYYY-MM-DD_HH-mm-ss}.png`
- **Toujours capture**, quel que soit le preset

### area screenshot (PNG, optionnel)

Crop rectangulaire du screenshot full page, si mode area selectionne.

- Taille typique : 10KB - 500KB
- Destination : clipboard (image/png, prioritaire sur full page) + Downloads
- Nommage : `pagenab-{domain}-{YYYY-MM-DD_HH-mm-ss}-area.png`

### element screenshot (PNG, optionnel)

Crop du screenshot full page correspondant au bounding rect de l'element selectionne, si mode element.

- Taille typique : 5KB - 300KB
- Destination : clipboard (image/png, prioritaire sur full page) + Downloads
- Nommage : `pagenab-{domain}-{YYYY-MM-DD_HH-mm-ss}-element.png`

### elementData (optionnel)

Donnees de l'element selectionne, si mode element.

```json
{
  "selector": "div.card > h2.title",
  "tagName": "H2",
  "dimensions": { "x": 100, "y": 200, "width": 400, "height": 50 },
  "outerHTML": "<h2 class=\"title\">Dashboard</h2>"
}
```

- `selector` : selecteur CSS de l'element
- `tagName` : nom de la balise HTML
- `dimensions` : position et taille de l'element (bounding rect)
- `outerHTML` : HTML externe de l'element (tronque a 50KB)

### metadata

Contexte global, toujours capture.

```json
{
  "version": "1.0.0",
  "timestamp": "2026-03-01T14:23:45.123Z",
  "url": "https://app.example.com/dashboard?tab=overview",
  "title": "Dashboard - My App",
  "domain": "app.example.com",
  "path": "/dashboard",
  "viewport": { "width": 1920, "height": 1080 },
  "userAgent": "Mozilla/5.0 ...",
  "language": "fr-FR",
  "colorScheme": "light",
  "captureMode": "fullpage",
  "areaRect": null,
  "preset": "full",
  "capturedData": ["console", "network", "dom", "cookies", "storage", "interactions", "performance"],
  "captureVersion": "1.0.0",
  "captureDuration": 1234
}
```

Le champ `capturedData` liste les types de donnees effectivement captures (depend du preset).

## Donnees conditionnelles

### console

Logs console. Light = errors + warnings uniquement. Full/Custom = tous les niveaux.

```json
{
  "summary": { "errors": 3, "warnings": 1, "logs": 12, "info": 2 },
  "logs": [
    {
      "level": "error",
      "message": "TypeError: Cannot read property 'map' of undefined",
      "source": "https://app.example.com/static/js/main.abc123.js",
      "line": 47,
      "column": 12,
      "stack": "TypeError: ...\n    at Dashboard (Dashboard.tsx:47:12)",
      "timestamp": "2026-03-01T14:23:40.100Z"
    }
  ]
}
```

**Regles** :
- Maximum 100 entrees (les plus recentes en priorite)
- Les erreurs sont toujours incluses meme si le cap est atteint
- Les messages dupliques sont dedupliques avec un compteur

### network

Requetes reseau problematiques. Light = failed only. Full/Custom = failed + slow.

```json
{
  "summary": { "total": 45, "failed": 2, "slow": 1, "opaque": 3 },
  "failed": [
    {
      "url": "https://api.example.com/users",
      "method": "POST",
      "status": 500,
      "statusText": "Internal Server Error",
      "type": "fetch",
      "duration": 234,
      "timestamp": "2026-03-01T14:23:42.000Z",
      "requestHeaders": {},
      "responseHeaders": { "content-type": "application/json" },
      "requestBodyPreview": "{\"name\":\"test\"}",
      "responseBodyPreview": "{\"error\":\"Internal server error\"}",
      "initiator": "Dashboard.tsx:23"
    }
  ],
  "slow": [ /* ... */ ],
  "all": [ /* all requests (Full mode only) */ ]
}
```

**Regles** :
- "failed" = status >= 400 ou erreur reseau. Max 50.
- "slow" = duration > 3000ms. Max 10.
- "all" = toutes les requetes (Full mode uniquement). Max 50 affichees dans le text/plain.
- Headers sensibles retires (Authorization, Cookie, Set-Cookie, X-API-Key, X-Auth-Token, headers contenant "token"/"key"/"secret"/"password")
- Body de reponse tronque a 10KB
- **Methode par defaut** : les resource loads (CSS, JS, images, fonts) ne passent pas par fetch/XHR intercepte — la methode est `"GET"` par defaut
- **Cross-origin opaque** : les reponses opaques (status=0, cross-origin sans CORS) sont comptees dans `total` mais exclues du detail. Le champ `opaque` dans le summary indique combien
- **Body preview** : le `responseBodyPreview` est capture pour les requetes echouees (status >= 400) ET les mutations API (POST/PUT/PATCH/DELETE) meme reussies. Le `requestBodyPreview` est capture pour les mutations.

### dom

Snapshot HTML nettoye.

**Regles de nettoyage** :
- Scripts inline et externes : retires
- Styles inline : preserves
- Inputs `type="password"` : valeur remplacee par `***`
- Attributs `data-*` : preserves
- Commentaires HTML : retires
- Taille max : 500KB (tronque les sous-arbres les plus profonds en premier)

### cookies

Cookies du domaine courant via `document.cookie` (non-httpOnly uniquement).

```json
{
  "summary": { "total": 12 },
  "cookies": [
    {
      "name": "session_id",
      "value": "abc1***",
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "theme",
      "value": "dark",
      "secure": false,
      "sameSite": "Lax"
    }
  ]
}
```

**Sanitization** :
- Valeurs tronquees a 20 caracteres + "***"
- Cookies dont le nom contient "token", "session", "auth", "key", "secret", "password" : valeur entierement masquee ("***")
- Seuls les cookies du domaine courant sont captures

### storage

Contenu de localStorage et sessionStorage du domaine.

```json
{
  "localStorage": {
    "summary": { "keys": 5, "totalSize": "12.3 KB" },
    "entries": [
      { "key": "user_preferences", "value": "{\"theme\":\"dark\",\"lang\":\"fr\"...}", "size": "256 B" },
      { "key": "auth_token", "value": "***", "size": "1.2 KB" }
    ]
  },
  "sessionStorage": {
    "summary": { "keys": 3, "totalSize": "4.1 KB" },
    "entries": [
      { "key": "form_draft", "value": "{\"title\":\"My post\",...}", "size": "512 B" }
    ]
  }
}
```

**Sanitization** :
- Valeurs tronquees a 200 caracteres
- Cles contenant "token", "auth", "secret", "password", "key" : valeur masquee ("***")

### interactions

Derniers evenements utilisateur avant la capture. Buffer circulaire de 50 events max.

```json
{
  "summary": { "total": 12, "clicks": 5, "scrolls": 4, "inputs": 3 },
  "events": [
    {
      "type": "click",
      "target": "button.submit-btn",
      "text": "Submit",
      "coordinates": { "x": 450, "y": 320 },
      "timestamp": "2026-03-01T14:29:58.000Z"
    },
    {
      "type": "scroll",
      "direction": "down",
      "distance": 450,
      "timestamp": "2026-03-01T14:29:55.000Z"
    },
    {
      "type": "input",
      "target": "input#search",
      "inputType": "text",
      "value": "***",
      "timestamp": "2026-03-01T14:29:50.000Z"
    }
  ]
}
```

**Sanitization** :
- Les valeurs des inputs sont TOUJOURS masquees ("***") — jamais de contenu utilisateur
- Seuls le type d'element, classes CSS, et ID sont enregistres
- Pas de capture de frappes clavier individuelles, uniquement l'evenement "input"

**Architecture** :
- Content script persistant bundle par Plasmo (depuis `src/contents/interactions.ts` avec `PlasmoCSConfig`)
- Le script est toujours injecte mais verifie un flag `pagenab_interactions_enabled` dans `chrome.storage.local`
- Desactive = impact minimal (script injecte mais handlers ignorent les evenements)

### performance

Metriques de performance de la page.

```json
{
  "loadTime": 2100,
  "domContentLoaded": 1200,
  "firstPaint": 800,
  "firstContentfulPaint": 950,
  "largestContentfulPaint": 1200,
  "cumulativeLayoutShift": 0.05,
  "firstInputDelay": 45,
  "memoryUsed": 47185920,
  "memoryLimit": 4294967296
}
```

Sources :
- `performance.getEntriesByType('navigation')` pour les timings de chargement
- `PerformanceObserver` pour LCP, CLS, FID
- `performance.memory` pour la memoire (Chrome uniquement)

## Taille estimee par capture

| Donnee | Taille typique | Min | Max |
|--------|---------------|-----|-----|
| screenshot.png | 400KB | 100KB | 2MB |
| area.png | 50KB | 10KB | 500KB |
| console | 15KB | 1KB | 100KB |
| network | 20KB | 1KB | 200KB |
| dom | 100KB | 5KB | 500KB |
| cookies | 3KB | 0.5KB | 10KB |
| storage | 10KB | 1KB | 50KB |
| interactions | 8KB | 1KB | 20KB |
| performance | 2KB | 1KB | 3KB |
| metadata | 1KB | 0.5KB | 2KB |

| Preset | Taille typique | Min | Max |
|--------|---------------|-----|-----|
| **Light** (full page) | ~440KB | ~105KB | ~2.3MB |
| **Full** (full page) | ~560KB | ~120KB | ~2.9MB |
| **Full** (area) | ~610KB | ~130KB | ~3.4MB |

## Format clipboard (text/plain)

### Principe multi-format

Le presse-papier contient deux formats simultanement via `ClipboardItem` :

```javascript
const clipboardItem = new ClipboardItem({
  'text/plain': new Blob([textData], { type: 'text/plain' }),
  'image/png': screenshotBlob
})
await navigator.clipboard.write([clipboardItem])
```

### Comportement au collage

| Outil | Texte | Image |
|-------|-------|-------|
| **Claude Code (CLI)** | Colle comme input | S'attache comme image (identique a Cmd+Shift+4) |
| **Claude.ai (web)** | Apparait dans le message | Apparait dans le message |
| **ChatGPT (web)** | Apparait dans le message | Apparait dans le message |
| **Cursor (IDE)** | Colle dans le contexte | S'attache au contexte |
| **Terminal classique** | Colle comme texte | Ignore |
| **Editeur texte** | Colle comme texte | Ignore |

### Quelle image dans le clipboard ?

| Mode | Image dans le clipboard |
|------|------------------------|
| Full page | Screenshot pleine page |
| Area | Screenshot de la zone selectionnee (plus pertinent) |
| Element | Screenshot de l'element selectionne (plus pertinent) |

En mode area/element, le full page screenshot est sauvegarde dans Downloads et son chemin est mentionne dans le texte.

### Exemple text/plain — Preset Light

```markdown
# Web page capture

**URL:** https://app.example.com/dashboard?tab=overview
**Title:** Dashboard - My App
**Time:** 2026-03-01 14:23:45
**Viewport:** 1920x1080
**Language:** fr-FR
**Browser:** Chrome 134 (macOS)
**Color scheme:** light
**Capture mode:** fullpage | Preset: light
**Includes:** screenshot, console (errors only), network (failed only)
**Excludes:** dom, cookies, storage, performance, interactions

## Console

16 entries, 3 errors, 1 warning

- **ERROR** (14:23:42) TypeError: Cannot read property 'map' of undefined — `Dashboard.tsx:47`
  at Dashboard (Dashboard.tsx:47:12)
  at renderWithHooks (react-dom.production.min.js:83:1)
- **ERROR** (14:23:43) ReferenceError: data is not defined — `utils.ts:12`
- **ERROR** (14:23:44) 404: /api/users/avatar/123.png

## Network

45 requests, 2 failed

- **FAIL** GET `/api/users` → 500 Internal Server Error (fetch, 234ms)
  Response: {"error":"Internal server error"}
- **FAIL** GET `/api/stats` → 403 Forbidden (fetch, 45ms)

## Screenshots

`~/Downloads/pagenab-app.example.com-2026-03-01_14-23-45.png`

---
Captured by PageNab v1.0.0
```

### Exemple text/plain — Preset Full

```markdown
# Web page capture

**URL:** https://app.example.com/dashboard?tab=overview
**Title:** Dashboard - My App
**Time:** 2026-03-01 14:23:45
**Viewport:** 1920x1080
**Language:** fr-FR
**Browser:** Chrome 134 (macOS)
**Color scheme:** light
**Capture mode:** fullpage | Preset: full
**Includes:** screenshot, console, network, dom, cookies, storage, performance, interactions

## Console

3 errors, 1 warning, 12 logs

- **ERROR** (14:23:42) TypeError: Cannot read property 'map' of undefined — `Dashboard.tsx:47`
  at Dashboard (Dashboard.tsx:47:12)
  at renderWithHooks (react-dom.production.min.js:83:1)
- **ERROR** (14:23:43) ReferenceError: data is not defined — `utils.ts:12`
- **ERROR** (14:23:44) 404: /api/users/avatar/123.png
- **WARN** (14:23:40) Each child in a list should have a unique "key" prop.

## Network

45 requests, 2 failed, 1 slow, 3 cross-origin excluded

- GET `/` → 200 (180ms, 14.2 KB, document)
- GET `/static/js/main.abc123.js` → 200 (95ms, 245.0 KB, script)
- GET `/static/css/app.def456.css` → 200 (42ms, 18.3 KB, stylesheet)
- **FAIL** POST `/api/users` → 500 Internal Server Error (234ms, 128 B, fetch)
  Request: {"name":"test"}
  Response: {"error":"Internal server error"}
- **FAIL** GET `/api/stats` → 403 Forbidden (45ms, 64 B, fetch)
- **SLOW** GET `/api/analytics` → 200 (5200ms, 1.2 MB, fetch)
- POST `/api/events` → 201 (150ms, 64 B, fetch)
  Request: {"action":"page_view","page":"/dashboard"}
  Response: {"id":42,"status":"created"}
- GET `/api/config` → 200 (85ms, 2.1 KB, fetch)
- ... and 37 more

## Cookies

session_id=*** | theme=dark | lang=fr | _ga=GA1.2***

## Storage

5 localStorage, 3 sessionStorage

- [local] user_preferences: `{"theme":"dark","lang":"fr"...}`
- [local] auth_token: `***`
- [session] form_draft: `{"title":"My post",...}`

## Performance

- FP: 800ms | FCP: 950ms | LCP: 1200ms
- Load: 2100ms | DOMContentLoaded: 1200ms
- CLS: 0.05 | FID: 45ms
- Memory: 45.0 MB / 4.0 GB

## Interactions

12 events (most recent first)

- [click] button.submit-btn "Submit" (14:29:58)
- [scroll] down 450px (14:29:55)
- [input] input#search *** (14:29:50)

## Screenshots

`~/Downloads/pagenab-app.example.com-2026-03-01_14-23-45.png`

## DOM (48.3 KB)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <title>Dashboard - My App</title>
  <meta charset="utf-8">
</head>
<body>
  <div class="dashboard-cards" data-testid="dashboard-cards">
    ...
  </div>
</body>
</html>
```

---
Captured by PageNab v1.0.0
```

### Regles de formatage essentielles

1. **Max 5 erreurs console** affichees, **max 3 warnings**
2. **Light** : max 5 requetes failed, max 3 slow. **Full** : max 50 requetes (toutes) avec body preview sur les echecs et mutations
3. **DOM toujours en dernier**, apres un separateur `--- DOM Snapshot ---`
4. **Sections absentes** : si une donnee n'a pas ete capturee, la section n'apparait pas (pas de "N/A")
5. **Pas de jugement** : jamais "bug found", "issue detected", etc.
6. L'algorithme de generation est implemente dans `src/lib/format.ts`

### Taille du texte par preset

| Preset | Taille typique | Tokens (~) | Use case |
|--------|---------------|------------|----------|
| Light | 500-2000 chars | 150-500 | Usage quotidien, bugs simples |
| Full (sans DOM) | 2K-5K chars | 500-1.5K | Bugs complexes, debugging |
| Full (avec DOM) | 5K-500K chars | 1.5K-150K | Bugs CSS/layout, accessibilite |
| Custom | Variable | Variable | Selon les donnees selectionnees |

Note : l'image (screenshot) est toujours presente dans le clipboard quel que soit le preset.

### Re-copie depuis l'historique

Quand l'utilisateur clique "Copy" sur une capture dans l'historique :
1. Le texte est re-genere avec le preset actuellement selectionne (pas celui de la capture originale)
2. Seules les donnees effectivement capturees sont incluses
3. L'image est chargee depuis le fichier Downloads, avec fallback sur la miniature si le fichier a ete supprime
4. Le clipboard est rempli en multi-format (text/plain + image/png)
