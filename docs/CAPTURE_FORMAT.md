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
  "summary": { "total": 45, "failed": 2, "slow": 1 },
  "failed": [
    {
      "url": "https://api.example.com/users",
      "status": 500,
      "statusText": "Internal Server Error",
      "type": "fetch",
      "duration": 234,
      "timestamp": "2026-03-01T14:23:42.000Z",
      "requestHeaders": {},
      "responseHeaders": { "content-type": "application/json" },
      "responseBody": "{\"error\":\"Internal server error\"}",
      "initiator": "Dashboard.tsx:23"
    }
  ],
  "slow": [ /* ... */ ]
}
```

**Regles** :
- "failed" = status >= 400 ou erreur reseau. Max 50.
- "slow" = duration > 3000ms. Max 10.
- Headers sensibles retires (Authorization, Cookie, Set-Cookie, X-API-Key, X-Auth-Token, headers contenant "token"/"key"/"secret"/"password")
- Body de reponse tronque a 10KB

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
