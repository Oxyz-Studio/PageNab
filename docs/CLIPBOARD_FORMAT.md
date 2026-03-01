# Clipboard Format Specification

## Vue d'ensemble

Quand PageNab capture une page, il met dans le presse-papier deux formats simultanement :
- **image/png** : le screenshot (l'image s'attache directement au collage, comme un screenshot natif)
- **text/plain** : les donnees textuelles de la page (depend du preset et des donnees capturees)

## Clipboard multi-format

### Principe

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

En mode area, le full page screenshot est sauvegarde dans Downloads et son chemin est mentionne dans le texte.

## Format text/plain par preset

### Preset Light

Donnees textuelles minimales. ~200-500 tokens.

```
[PageNab] https://app.example.com/dashboard?tab=overview
Captured: 2026-03-01 14:23:45 | Viewport: 1920x1080 | Lang: fr-FR | Preset: Light

Console: 3 errors, 1 warning
  [ERROR] TypeError: Cannot read property 'map' of undefined
          Dashboard.tsx:47:12
          Stack: at Dashboard (Dashboard.tsx:47:12)
                 at renderWithHooks (react-dom.production.min.js:83:1)
  [ERROR] ReferenceError: data is not defined
          utils.ts:12
  [ERROR] 404: /api/users/avatar/123.png
  [WARN]  Each child in a list should have a unique "key" prop.

Network: 2 failed
  [FAIL] /api/users → 500 Internal Server Error (fetch)
         Response: {"error":"Internal server error"}
  [FAIL] /api/stats → 403 Forbidden (fetch)

Screenshot: ~/Downloads/pagenab-app.example.com-2026-03-01_14-23-45.png
```

### Preset Full

Toutes les donnees. ~1.5K-150K tokens.

```
[PageNab] https://app.example.com/dashboard?tab=overview
Captured: 2026-03-01 14:23:45 | Viewport: 1920x1080 | Lang: fr-FR | Preset: Full

Console: 3 errors, 1 warning, 12 logs
  [ERROR] TypeError: Cannot read property 'map' of undefined
          Dashboard.tsx:47:12
          Stack: at Dashboard (Dashboard.tsx:47:12)
                 at renderWithHooks (react-dom.production.min.js:83:1)
  [ERROR] ReferenceError: data is not defined
          utils.ts:12
  [ERROR] 404: /api/users/avatar/123.png
  [WARN]  Each child in a list should have a unique "key" prop.

Network: 45 total, 2 failed, 1 slow
  [FAIL] /api/users → 500 Internal Server Error (fetch)
         Response: {"error":"Internal server error"}
  [FAIL] /api/stats → 403 Forbidden (fetch)
  [SLOW] /api/analytics → 200 (5200ms) (fetch)

Cookies: 12 cookies
  session_id: *** | theme: dark | lang: fr | _ga: GA1.2***

Storage: 5 localStorage keys, 3 sessionStorage keys
  [local] user_preferences: {"theme":"dark","lang":"fr"...}
  [local] auth_token: ***
  [session] form_draft: {"title":"My post",...}

Performance:
  Load: 2100ms | DOMContentLoaded: 1200ms
  LCP: 1200ms | CLS: 0.05 | FID: 45ms
  Memory: 45 MB / 4096 MB

Interactions: 12 events (showing last 5)
  [click] button.submit-btn "Submit" (14:29:58)
  [scroll] down 450px (14:29:55)
  [input] input#search *** (14:29:50)

Screenshot: ~/Downloads/pagenab-app.example.com-2026-03-01_14-23-45.png

--- DOM Snapshot ---
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

### Preset Custom

Le texte contient uniquement les sections correspondant aux donnees cochees par l'utilisateur. Meme format que Full pour chaque section presente.

### Avec area capture

Les chemins screenshots deviennent :
```
Screenshot (full page): ~/Downloads/pagenab-app.example.com-2026-03-01_14-23-45.png
Screenshot (area): ~/Downloads/pagenab-app.example.com-2026-03-01_14-23-45-area.png
```

## Generation du texte

### Algorithme

```
function generateTextContent(bundle):
  lines = []
  preset = bundle.metadata.preset
  capturedData = bundle.metadata.capturedData

  // Header (toujours)
  lines.push(`[PageNab] ${bundle.metadata.url}`)
  lines.push(`Captured: ${formatDate(bundle.metadata.timestamp)} | Viewport: ${viewport} | Lang: ${lang} | Preset: ${preset}`)
  lines.push("")

  // Console (si capture)
  if "console" in capturedData:
    summary = formatConsoleSummary(bundle.console)
    lines.push(`Console: ${summary}`)
    for log in bundle.console.logs.filter(e => e.level === 'error').slice(0, 5):
      lines.push(`  [ERROR] ${log.message}`)
      lines.push(`          ${extractFile(log.source)}:${log.line}`)
      if log.stack:
        lines.push(`          Stack: ${formatStack(log.stack, maxLines=3)}`)
    for log in bundle.console.logs.filter(e => e.level === 'warn').slice(0, 3):
      lines.push(`  [WARN]  ${log.message}`)

  // Network (si capture)
  if "network" in capturedData:
    summary = formatNetworkSummary(bundle.network, preset)
    lines.push(`Network: ${summary}`)
    for req in bundle.network.failed.slice(0, 5):
      lines.push(`  [FAIL] ${extractPath(req.url)} → ${req.status} ${req.statusText} (${req.type})`)
      if req.responseBody:
        lines.push(`         Response: ${truncate(req.responseBody, 200)}`)
    if preset !== 'light':
      for req in bundle.network.slow.slice(0, 3):
        lines.push(`  [SLOW] ${extractPath(req.url)} → ${req.status} (${req.duration}ms) (${req.type})`)

  // Cookies (si capture)
  if "cookies" in capturedData:
    lines.push(`Cookies: ${bundle.cookies.summary.total} cookies`)
    cookieList = bundle.cookies.cookies.map(c => `${c.name}: ${c.value}`).join(" | ")
    lines.push(`  ${truncate(cookieList, 200)}`)

  // Storage (si capture)
  if "storage" in capturedData:
    ls = bundle.storage.localStorage
    ss = bundle.storage.sessionStorage
    lines.push(`Storage: ${ls.summary.keys} localStorage keys, ${ss.summary.keys} sessionStorage keys`)
    for entry in ls.entries.slice(0, 3):
      lines.push(`  [local] ${entry.key}: ${truncate(entry.value, 100)}`)
    for entry in ss.entries.slice(0, 3):
      lines.push(`  [session] ${entry.key}: ${truncate(entry.value, 100)}`)

  // Performance (si capture)
  if "performance" in capturedData:
    p = bundle.performance
    lines.push("Performance:")
    lines.push(`  Load: ${p.loadTime}ms | DOMContentLoaded: ${p.domContentLoaded}ms`)
    lines.push(`  LCP: ${p.largestContentfulPaint}ms | CLS: ${p.cumulativeLayoutShift} | FID: ${p.firstInputDelay}ms`)
    if p.memoryUsed:
      lines.push(`  Memory: ${formatBytes(p.memoryUsed)} / ${formatBytes(p.memoryLimit)}`)

  // Interactions (si capture)
  if "interactions" in capturedData:
    lines.push(`Interactions: ${bundle.interactions.summary.total} events (showing last ${Math.min(bundle.interactions.events.length, 5)})`)
    for event in bundle.interactions.events.slice(0, 5):
      lines.push(`  [${event.type}] ${formatInteraction(event)}`)

  // Screenshot path(s) (toujours)
  lines.push("")
  if bundle.captureMode === 'area':
    lines.push(`Screenshot (full page): ${bundle.screenshotPath}`)
    lines.push(`Screenshot (area): ${bundle.areaScreenshotPath}`)
  else:
    lines.push(`Screenshot: ${bundle.screenshotPath}`)

  // DOM (si capture, toujours en dernier)
  if "dom" in capturedData && bundle.dom:
    lines.push("")
    lines.push("--- DOM Snapshot ---")
    lines.push(bundle.dom)

  return lines.join("\n")
```

### Regles de formatage

1. **URL** : complete (avec query params), pas de troncation
2. **Preset** : toujours indique dans le header
3. **Erreurs console** : message + fichier:ligne + stack trace (max 3 lignes de stack)
4. **Network** : path + status + type (initiatorType) + body de reponse (tronque a 200 chars). Note : `PerformanceResourceTiming` n'expose pas la methode HTTP.
5. **Cookies** : nom + valeur (tronquee/masquee), une ligne resumee
6. **Storage** : top 3 entries par type, valeurs tronquees a 100 chars
7. **Performance** : metriques sur 2-3 lignes compactes
8. **Interactions** : top 5 events recents, valeurs masquees
9. **Screenshot** : chemin complet vers le fichier telecharge
10. **DOM** : toujours en dernier, apres un separateur clair `--- DOM Snapshot ---`
11. **Max 5 erreurs console** et **max 5 requetes failed**
12. **Max 3 warnings** et **max 3 requetes slow**
13. **Pas de jugement** : jamais "bug found", "issue detected", etc.
14. **Sections absentes** : si une donnee n'a pas ete capturee, la section n'apparait pas (pas de "N/A")

## Taille du texte par preset

| Preset | Taille typique | Tokens (~) | Use case |
|--------|---------------|------------|----------|
| Light | 500-2000 chars | 150-500 | Usage quotidien, bugs simples |
| Full (sans DOM) | 2K-5K chars | 500-1.5K | Bugs complexes, debugging |
| Full (avec DOM) | 5K-500K chars | 1.5K-150K | Bugs CSS/layout, accessibilite |
| Custom | Variable | Variable | Selon les donnees selectionnees |

Note : l'image (screenshot) est toujours presente dans le clipboard quel que soit le preset. Elle ne consomme pas de tokens texte.

## Re-copie depuis l'historique

Quand l'utilisateur clique "Copy" sur une capture dans l'historique :
1. Le texte est re-genere avec le preset actuellement selectionne (pas celui de la capture originale)
2. Seules les donnees effectivement capturees sont incluses (on ne peut pas ajouter du DOM si la capture originale ne l'a pas capture)
3. L'image est chargee depuis le fichier Downloads, avec fallback sur la miniature si le fichier a ete supprime
4. Le clipboard est rempli en multi-format (text/plain + image/png)
