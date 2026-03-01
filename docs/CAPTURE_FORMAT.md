# Capture Format Specification

## Vue d'ensemble

Chaque capture PageNab produit un dossier contenant 5 a 7 fichiers. Le format est concu pour etre lisible par un humain ET par une AI.

## Structure du dossier

```
{YYYY-MM-DD}_{HH-mm-ss}_{domain}/
├── screenshot.png          (obligatoire)
├── element.png             (optionnel — si element selectionne)
├── console.json            (obligatoire)
├── network.json            (obligatoire)
├── dom.html                (obligatoire)
├── locators.json           (obligatoire)
└── metadata.json           (obligatoire)
```

**Nommage du dossier** : `2026-03-01_14-23-45_app.example.com`
- Date ISO 8601 avec tirets au lieu de deux-points (compatibilite systeme de fichiers)
- Domaine du site capture (sans protocole, sans path)

## Fichiers detailles

### metadata.json

Toujours lu en premier par l'AI. Contient le contexte global.

```json
{
  "version": "1.0.0",
  "timestamp": "2026-03-01T14:23:45.123Z",
  "url": "https://app.example.com/dashboard?tab=overview",
  "title": "Dashboard - My App",
  "domain": "app.example.com",
  "path": "/dashboard",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
  "language": "fr-FR",
  "colorScheme": "light",
  "hasSelectedElement": true,
  "selectedElementSelector": "div.dashboard-cards",
  "captureVersion": "1.0.0",
  "captureDuration": 1234
}
```

### screenshot.png

Screenshot pleine page via `chrome.tabs.captureVisibleTab()`.

- Format : PNG
- Resolution : viewport reel de l'utilisateur
- Taille typique : 200KB - 1MB

### element.png

Screenshot de l'element selectionne uniquement. Genere par :
1. `element.getBoundingClientRect()` pour les coordonnees
2. Crop du screenshot pleine page

- Present uniquement si l'utilisateur a selectionne un element
- Taille typique : 10KB - 200KB

### console.json

Logs console captures au moment du nab.

```json
{
  "summary": {
    "errors": 3,
    "warnings": 1,
    "logs": 12,
    "info": 2
  },
  "logs": [
    {
      "level": "error",
      "message": "TypeError: Cannot read property 'map' of undefined",
      "source": "https://app.example.com/static/js/main.abc123.js",
      "line": 47,
      "column": 12,
      "stack": "TypeError: Cannot read property 'map' of undefined\n    at Dashboard (Dashboard.tsx:47:12)\n    at renderWithHooks (react-dom.production.min.js:83:1)",
      "timestamp": "2026-03-01T14:23:40.100Z"
    },
    {
      "level": "warning",
      "message": "Each child in a list should have a unique \"key\" prop.",
      "source": "react-jsx-runtime.production.min.js",
      "line": 1,
      "column": 1,
      "stack": null,
      "timestamp": "2026-03-01T14:23:41.200Z"
    }
  ]
}
```

**Regles de capture** :
- Maximum 100 entrees (les plus recentes en priorite)
- Les erreurs sont toujours incluses meme si le cap est atteint
- Les stack traces sont preservees integralement
- Les messages dupliques sont dedupliques avec un compteur

### network.json

Requetes reseau echouees ou lentes.

```json
{
  "summary": {
    "total": 45,
    "failed": 2,
    "slow": 1
  },
  "failed": [
    {
      "url": "https://api.example.com/users",
      "method": "GET",
      "status": 500,
      "statusText": "Internal Server Error",
      "type": "fetch",
      "duration": 234,
      "timestamp": "2026-03-01T14:23:42.000Z",
      "requestHeaders": {},
      "responseHeaders": {
        "content-type": "application/json"
      },
      "responseBody": "{\"error\":\"Internal server error\"}",
      "initiator": "Dashboard.tsx:23"
    }
  ],
  "slow": [
    {
      "url": "https://api.example.com/analytics",
      "method": "POST",
      "status": 200,
      "type": "fetch",
      "duration": 5200,
      "timestamp": "2026-03-01T14:23:38.000Z"
    }
  ]
}
```

**Regles** :
- "failed" = status >= 400 ou erreur reseau
- "slow" = duration > 3000ms
- Maximum 50 requetes echouees, 10 requetes lentes
- Headers sensibles retires (Authorization, Cookie, etc.)
- Body de reponse tronque a 10KB

### dom.html

Snapshot HTML nettoye.

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <title>Dashboard - My App</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <!-- PageNab: Full page DOM snapshot -->
  <!-- Si element selectionne, seul le sous-arbre est capture -->
  <div class="dashboard-cards" data-testid="dashboard-cards">
    <div class="card">
      <h3>Revenue</h3>
      <p class="value">$12,345</p>
    </div>
    <!-- ... -->
  </div>
</body>
</html>
```

**Regles de nettoyage** :
- Scripts inline (`<script>`) : retires
- Scripts externes (`<script src="...">`) : retires
- Styles inline (`style="..."`) : preserves (importants pour le layout)
- Styles externes (`<link rel="stylesheet">`) : reference preservee, contenu non inclus
- Inputs `type="password"` : valeur remplacee par `***`
- Attributs `data-*` : preserves (utiles pour les locators)
- Commentaires HTML : retires
- Taille max : 500KB (tronque les sous-arbres les plus profonds en premier)

### locators.json

Locators Playwright generes pour les elements interactifs.

```json
{
  "version": "1.0.0",
  "strategy": "prioritized",
  "locators": [
    {
      "element": "button",
      "description": "Submit button in login form",
      "locators": [
        { "type": "getByRole", "value": "getByRole('button', { name: 'Submit' })", "confidence": 0.95 },
        { "type": "getByTestId", "value": "getByTestId('login-submit')", "confidence": 0.90 },
        { "type": "getByText", "value": "getByText('Submit')", "confidence": 0.70 },
        { "type": "css", "value": "form.login button[type='submit']", "confidence": 0.50 }
      ],
      "boundingBox": { "x": 100, "y": 200, "width": 120, "height": 40 }
    }
  ]
}
```

**Strategie de generation** (par priorite) :
1. `getByRole` — le plus resilient, base sur l'accessibilite
2. `getByTestId` — si `data-testid` present
3. `getByText` — pour les elements avec texte visible unique
4. `getByLabel` — pour les inputs avec label associe
5. CSS selector — fallback, moins resilient

**Score de confiance** :
- 0.9+ : locator tres fiable (role + nom unique, testid)
- 0.7-0.9 : fiable (texte unique, label)
- 0.5-0.7 : acceptable (CSS specifique)
- < 0.5 : fragile (CSS generique), marque comme warning

## Taille estimee par capture

| Fichier | Taille typique | Min | Max |
|---------|---------------|-----|-----|
| screenshot.png | 400KB | 100KB | 2MB |
| element.png | 50KB | 5KB | 500KB |
| console.json | 15KB | 1KB | 100KB |
| network.json | 20KB | 1KB | 200KB |
| dom.html | 100KB | 5KB | 500KB |
| locators.json | 10KB | 1KB | 50KB |
| metadata.json | 1KB | 0.5KB | 2KB |
| **Total** | **~600KB** | **~115KB** | **~3.5MB** |
