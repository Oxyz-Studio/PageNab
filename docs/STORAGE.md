# Storage

## Vue d'ensemble

PageNab V1 utilise trois couches de stockage :
1. **Clipboard** (ephemere) : text/plain + image/png pour le collage immediat
2. **chrome.downloads** (persistant) : screenshots en fichiers PNG
3. **chrome.storage.local** (persistant) : historique des captures + settings

## 1. Clipboard — collage immediat

Le clipboard contient deux formats simultanement via `ClipboardItem` :

```javascript
const clipboardItem = new ClipboardItem({
  'text/plain': new Blob([textData], { type: 'text/plain' }),
  'image/png': screenshotBlob
})
await navigator.clipboard.write([clipboardItem])
```

- **text/plain** : donnees textuelles (metadata, console, network, cookies, storage, perf, interactions, DOM optionnel selon le preset)
- **image/png** : screenshot (full page, ou area si mode area)

Quand l'utilisateur colle, l'image s'attache directement (comme un screenshot natif) et le texte fournit le contexte.

Le clipboard est ephemere — il est ecrase au prochain copier. Les screenshots sont aussi sauvegardes dans Downloads pour la persistance.

## 2. Screenshots → chrome.downloads

Les screenshots sont sauvegardes dans le dossier Downloads pour la persistance.

```javascript
// Full page (toujours)
chrome.downloads.download({
  url: screenshotDataUrl,
  filename: `pagenab-${domain}-${timestamp}.png`,
  saveAs: false  // silencieux, pas de dialog
})

// Area (en plus du full page, si mode area)
chrome.downloads.download({
  url: areaDataUrl,
  filename: `pagenab-${domain}-${timestamp}-area.png`,
  saveAs: false
})
```

**Nommage** :
- Full page : `pagenab-{domain}-{YYYY-MM-DD_HH-mm-ss}.png`
- Area : `pagenab-{domain}-{YYYY-MM-DD_HH-mm-ss}-area.png`

**Utilite** :
- Backup si le clipboard est ecrase avant le collage
- Source image pour re-copier depuis l'historique
- Reference dans le text/plain pour les outils CLI qui lisent les fichiers par chemin

## 3. Historique + Settings → chrome.storage.local

### Structure d'une capture stockee

```typescript
interface StoredCapture {
  id: string                    // "{timestamp}_{domain}"
  timestamp: string             // ISO 8601
  url: string                   // URL complete
  domain: string                // Domaine seul
  title: string                 // Titre de la page

  screenshotThumbnail: string   // Base64 miniature (~50KB) pour preview popup
  screenshotPath: string        // Chemin du fichier dans Downloads
  areaScreenshotPath?: string   // Chemin area si applicable

  preset: 'light' | 'full' | 'custom'  // Preset utilise pour cette capture
  capturedData: string[]        // Liste des donnees capturees ["console", "network", "dom", ...]

  // Donnees toujours presentes
  metadata: CaptureMetadata

  // Donnees conditionnelles (presentes si capturees selon le preset)
  console?: {
    summary: { errors: number; warnings: number; logs: number; info: number }
    logs: ConsoleLog[]
  }

  network?: {
    summary: { total: number; failed: number; slow: number }
    failed: NetworkRequest[]
    slow: NetworkRequest[]
  }

  dom?: string                  // DOM snapshot complet nettoye

  cookies?: {
    summary: { total: number }
    cookies: CookieEntry[]
  }

  storage?: {
    localStorage: {
      summary: { keys: number; totalSize: string }
      entries: StorageEntry[]
    }
    sessionStorage: {
      summary: { keys: number; totalSize: string }
      entries: StorageEntry[]
    }
  }

  interactions?: {
    summary: { total: number; clicks: number; scrolls: number; inputs: number }
    events: InteractionEvent[]
  }

  performance?: {
    loadTime: number
    domContentLoaded: number
    firstPaint: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    cumulativeLayoutShift: number
    firstInputDelay: number
    memoryUsed?: number
    memoryLimit?: number
  }

  captureMode: 'fullpage' | 'area'
}
```

### Settings

```typescript
interface Settings {
  preset: 'light' | 'full' | 'custom'   // Dernier preset selectionne
  customOptions: {                        // Options pour le preset Custom
    console: boolean    // defaut: true
    network: boolean    // defaut: true
    dom: boolean        // defaut: false
    cookies: boolean    // defaut: false
    storage: boolean    // defaut: false
    interactions: boolean // defaut: false
    performance: boolean // defaut: false
  }
  screenshotMode: 'fullpage' | 'area'    // Dernier mode selectionne
  notifications: boolean                  // Notification apres capture
  maxCaptures: number                     // Limite historique (defaut 20)
  shortcut: string                        // Raccourci affiche (lecture seule, gere via chrome.commands)
}
```

**Valeurs par defaut** :

```json
{
  "preset": "light",
  "customOptions": {
    "console": true,
    "network": true,
    "dom": false,
    "cookies": false,
    "storage": false,
    "interactions": false,
    "performance": false
  },
  "screenshotMode": "fullpage",
  "notifications": true,
  "maxCaptures": 20,
  "shortcut": "Ctrl+Shift+N"
}
```

### Organisation dans chrome.storage.local

```json
{
  "captures": [ /* StoredCapture[] ordonne du plus recent au plus ancien */ ],
  "settings": { /* Settings */ }
}
```

## Limites de stockage

### chrome.storage.local

- **Quota** : 10 MB par defaut
- **Taille par capture** :
  - Light : ~70-100 KB (thumbnail ~50KB + console ~10KB + network ~5KB + metadata ~1KB)
  - Full : ~150-250 KB (thumbnail + console + network + DOM ~100KB + cookies ~3KB + storage ~10KB + interactions ~8KB + perf ~2KB + metadata)
  - Custom : variable selon les donnees selectionnees
- **Capacite estimee** : ~40-100 captures dans 10MB selon le preset
- Avec le defaut de 20 captures : ~1.5-5 MB utilises. Large marge.

### Gestion de la limite

Quand une nouvelle capture est ajoutee et que `captures.length >= maxCaptures` :

```
function addCapture(newCapture):
  captures = await getCaptures()
  captures.unshift(newCapture)  // Ajouter en tete

  while captures.length > settings.maxCaptures:
    captures.pop()  // Supprimer la plus ancienne

  await chrome.storage.local.set({ captures })
```

Les screenshots dans Downloads ne sont PAS supprimes automatiquement.

### Suppression manuelle

L'utilisateur peut supprimer une capture depuis l'ecran History (bouton ✕). Cela retire la capture de `chrome.storage.local` uniquement (pas du dossier Downloads).

### Re-copier depuis l'historique

Quand l'utilisateur clique "Copy" sur une capture dans l'historique :
1. Le texte est re-genere avec le preset actuellement selectionne
2. Seules les donnees effectivement capturees sont incluses (on ne peut pas generer du DOM si la capture Light ne l'a pas capture)
3. L'image est chargee depuis le fichier Downloads (via le chemin stocke)
4. Si le fichier a ete supprime : la miniature est utilisee comme fallback
5. Le clipboard est rempli en multi-format (text/plain + image/png)
6. L'utilisateur peut coller immediatement

## Evolution V2

- Native Messaging Host : ecriture dans `~/.pagenab/` avec structure organisee
- Rotation automatique (maxCaptures, maxAge, maxStorage) incluant les fichiers Downloads
- Symlink `latest` pour referencer la derniere capture
- MCP Server lisant depuis `~/.pagenab/`
