# Prompt Format Specification

## Vue d'ensemble

Le prompt genere par PageNab est la piece maitresse de l'experience utilisateur. Il doit etre :
- **Neutre** : pas de presupposition sur l'intention (bug, amelioration, comprehension)
- **Informatif** : resume les infos critiques inline
- **Actionnable** : l'AI sait immediatement quels fichiers lire
- **Compact** : ne pas gaspiller le contexte de l'AI

## Formats disponibles

### 1. Hybrid (defaut) — recommande

Resume inline des infos critiques + chemins fichiers pour les details.

```
Web capture — https://app.example.com/dashboard
Captured: 2026-03-01 14:23:45 | Viewport: 1920x1080 | Lang: fr-FR

Console: 3 errors, 1 warning
  - TypeError: Cannot read property 'map' of undefined (Dashboard.tsx:47)
  - ReferenceError: data is not defined (utils.ts:12)
  - 404: /api/users/avatar/123.png
Network: 2 failed
  - GET /api/users → 500 Internal Server Error
  - GET /api/stats → 403 Forbidden
Selected element: div.dashboard-cards

Full capture: ~/.pagenab/latest/
├── screenshot.png        (full page)
├── element.png           (selected element)
├── console.json          (full logs with stack traces)
├── network.json          (failed/slow requests with payloads)
├── dom.html              (clean DOM snapshot)
├── locators.json         (Playwright locators)
└── metadata.json         (page info)
```

**Pourquoi c'est le meilleur format** :

| Avantage | Detail |
|----------|--------|
| Screenshot lisible | L'AI lit `screenshot.png` via Read tool (images supportees) |
| Resume immediat | Erreurs console + network visibles sans tool call |
| Token efficient | ~500 tokens pour le prompt vs ~125K pour le DOM inline |
| Relecture possible | Si le contexte AI compresse, les fichiers restent lisibles |
| Selectif | L'AI lit seulement les fichiers pertinents pour la demande |

### 2. Paths Only — minimaliste

Chemins fichiers uniquement, pas de resume inline.

```
Web capture — https://app.example.com/dashboard
Captured: 2026-03-01 14:23:45

~/.pagenab/latest/
├── screenshot.png
├── element.png
├── console.json
├── network.json
├── dom.html
├── locators.json
└── metadata.json
```

Utilisation : quand l'utilisateur veut garder le prompt ultra court et laisser l'AI tout decouvrir.

### 3. Full Inline — tout dans le clipboard

Toutes les donnees textuelles directement dans le prompt (sauf images).

```
Web capture — https://app.example.com/dashboard
Captured: 2026-03-01 14:23:45 | Viewport: 1920x1080

## Console Logs
[ERROR] TypeError: Cannot read property 'map' of undefined
  at Dashboard (Dashboard.tsx:47:12)
  at renderWithHooks (react-dom.production.min.js:83:1)
...

## Network Errors
GET https://api.example.com/users → 500
Response: {"error":"Internal server error"}
...

## DOM Snapshot
<!DOCTYPE html>
<html lang="fr">
...

## Playwright Locators
getByRole('button', { name: 'Submit' })
...

Screenshots saved at: ~/.pagenab/latest/screenshot.png
```

**Attention** : peut consommer 50K-150K tokens. Non recommande sauf pour les AI avec tres grande fenetre de contexte.

## Generation du resume inline

### Algorithme

```
function generateSummary(bundle):
  lines = []

  // Header
  lines.push(`Web capture — ${bundle.metadata.url}`)
  lines.push(`Captured: ${formatDate(bundle.metadata.timestamp)} | Viewport: ${viewport} | Lang: ${lang}`)
  lines.push("")

  // Console summary (top 3 erreurs)
  if bundle.console.summary.errors > 0:
    lines.push(`Console: ${errors} errors, ${warnings} warning`)
    for error in bundle.console.logs.filter(e => e.level === 'error').slice(0, 3):
      lines.push(`  - ${error.message} (${extractFile(error.source)}:${error.line})`)

  // Network summary (toutes les failed)
  if bundle.network.summary.failed > 0:
    lines.push(`Network: ${failed} failed`)
    for req in bundle.network.failed.slice(0, 5):
      lines.push(`  - ${req.method} ${req.url} → ${req.status} ${req.statusText}`)

  // Selected element
  if bundle.metadata.hasSelectedElement:
    lines.push(`Selected element: ${bundle.metadata.selectedElementSelector}`)

  // File paths
  lines.push("")
  lines.push(`Full capture: ~/.pagenab/latest/`)
  lines.push(formatFileTree(bundle))

  return lines.join("\n")
```

### Regles de formatage

1. **URL** : complete (avec query params), pas de troncation
2. **Erreurs console** : message court + fichier:ligne (pas de stack trace inline)
3. **Network** : methode + path relatif + status (pas de headers inline)
4. **Element selectionne** : selecteur CSS le plus court possible
5. **Arbre fichiers** : format `tree` avec description courte entre parentheses
6. **Max 3 erreurs console** et **max 5 requetes failed** dans le resume
7. **Pas de jugement** : jamais "bug found", "issue detected", etc.

## Taille du prompt par format

| Format | Taille typique | Tokens (~) | Use case |
|--------|---------------|------------|----------|
| Hybrid | 500-1500 chars | 150-400 | Usage quotidien (recommande) |
| Paths only | 200-400 chars | 50-100 | Minimaliste |
| Full inline | 50K-500K chars | 15K-150K | Contexte large, pas de fichier local |
