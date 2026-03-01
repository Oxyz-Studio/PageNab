# Storage Management

## Vue d'ensemble

PageNab stocke les captures localement dans `~/.pagenab/`. Le systeme de stockage est concu pour etre transparent, previsible et auto-gere.

## Structure du repertoire

```
~/.pagenab/
├── captures/
│   ├── 2026-03-01_14-23-45_app.example.com/
│   │   ├── screenshot.png
│   │   ├── element.png
│   │   ├── console.json
│   │   ├── network.json
│   │   ├── dom.html
│   │   ├── locators.json
│   │   └── metadata.json
│   ├── 2026-03-01_14-30-12_dashboard.example.com/
│   │   └── ...
│   └── ...
├── latest -> captures/2026-03-01_14-30-12_dashboard.example.com
├── config.json
└── host/
    ├── pagenab-host.js
    └── manifest.json
```

## Configuration

### config.json

```json
{
  "maxCaptures": 20,
  "maxAgeDays": 7,
  "maxStorageMB": 500,
  "captureDir": "~/.pagenab",
  "clipboardFormat": "hybrid",
  "autoScreenshot": true,
  "sanitizeHeaders": true,
  "notifications": true
}
```

### Parametres

| Parametre | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `maxCaptures` | number | 20 | Nombre max de captures conservees |
| `maxAgeDays` | number | 7 | Suppression auto apres N jours |
| `maxStorageMB` | number | 500 | Taille max totale du dossier captures |
| `captureDir` | string | `~/.pagenab` | Repertoire racine |
| `clipboardFormat` | string | `hybrid` | Format du prompt : `hybrid`, `paths-only`, `full-inline` |
| `autoScreenshot` | boolean | `true` | Screenshot automatique a chaque capture |
| `sanitizeHeaders` | boolean | `true` | Retirer les headers sensibles |
| `notifications` | boolean | `true` | Notification apres capture |

## Politique de rotation

La rotation s'execute **avant** chaque nouvelle capture pour garantir que l'espace est disponible.

### Algorithme de rotation

```
function rotate():
  captures = listCaptures().sortByDate(oldest_first)

  // 1. Supprimer les captures expirees (age)
  for capture in captures:
    if capture.age > maxAgeDays:
      delete(capture)

  // 2. Supprimer les captures excedentaires (nombre)
  captures = listCaptures().sortByDate(oldest_first)
  while captures.length >= maxCaptures:
    delete(captures.shift())  // supprime la plus ancienne

  // 3. Supprimer si taille totale depasse la limite
  captures = listCaptures().sortByDate(oldest_first)
  while totalSize(captures) > maxStorageMB * 1024 * 1024:
    delete(captures.shift())  // supprime la plus ancienne
```

### Priorites de suppression

1. **Age** : les captures plus vieilles que `maxAgeDays` sont toujours supprimees
2. **Nombre** : si plus de `maxCaptures`, les plus anciennes sont supprimees
3. **Taille** : si la taille totale depasse `maxStorageMB`, les plus anciennes sont supprimees

### Impact reel sur le stockage

| Scenario | Captures/jour | Taille/capture | Stockage utilise |
|----------|--------------|----------------|-----------------|
| Usage leger | 2-3 | ~600KB | ~12MB (20 captures) |
| Usage normal | 5-10 | ~600KB | ~12MB (20 captures max) |
| Usage intensif | 20+ | ~1MB | ~20MB (rotation active) |

Avec les parametres par defaut, **le stockage ne depassera jamais 20 captures * ~2MB = ~40MB** dans le pire cas.

## Symlink `latest`

Le symlink `~/.pagenab/latest` pointe toujours vers la capture la plus recente :

```bash
ls -la ~/.pagenab/latest
# latest -> captures/2026-03-01_14-30-12_dashboard.example.com
```

Cela permet au prompt clipboard de toujours referencer `~/.pagenab/latest/` quel que soit le nom du dossier. L'utilisateur n'a pas besoin de connaitre le timestamp.

**Mise a jour** : le symlink est recree (delete + create) a chaque nouvelle capture.

**Fallback Windows** : Windows ne supporte pas les symlinks sans privileges admin. Sur Windows, `latest` est un fichier texte contenant le chemin du dernier dossier de capture.

## Native Messaging Host

### Role

Le Native Messaging Host est un petit script Node.js qui recoit les donnees de capture depuis l'extension Chrome et les ecrit sur le disque.

### Protocole

Communication via stdin/stdout avec le format Native Messaging de Chrome :
- Chaque message est prefixe par 4 bytes (uint32 little-endian) indiquant la taille
- Le contenu est du JSON

### Messages

**Extension -> Host** :
```json
{
  "type": "write_capture",
  "captureId": "2026-03-01_14-23-45_app.example.com",
  "files": {
    "metadata.json": "{ ... }",
    "console.json": "{ ... }",
    "network.json": "{ ... }",
    "dom.html": "<!DOCTYPE html>...",
    "locators.json": "{ ... }",
    "screenshot.png": "<base64>",
    "element.png": "<base64>"
  }
}
```

**Host -> Extension** :
```json
{
  "type": "write_complete",
  "captureId": "2026-03-01_14-23-45_app.example.com",
  "path": "/Users/alex/.pagenab/captures/2026-03-01_14-23-45_app.example.com",
  "latestPath": "/Users/alex/.pagenab/latest"
}
```

### Installation

Script d'installation automatique (`install-host.js`) :

```bash
npx pagenab-host install
```

Ce script :
1. Cree le repertoire `~/.pagenab/host/`
2. Copie `pagenab-host.js` dans ce repertoire
3. Genere le manifest Native Messaging :
   ```json
   {
     "name": "com.oxyz.pagenab",
     "description": "PageNab Native Messaging Host",
     "path": "/Users/alex/.pagenab/host/pagenab-host.js",
     "type": "stdio",
     "allowed_origins": ["chrome-extension://EXTENSION_ID/"]
   }
   ```
4. Place le manifest dans le repertoire Chrome :
   - macOS : `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
   - Linux : `~/.config/google-chrome/NativeMessagingHosts/`
   - Windows : registre `HKCU\Software\Google\Chrome\NativeMessagingHosts\`

### Mode fallback (sans Native Host)

Si le Native Host n'est pas installe, PageNab fonctionne en mode "download" :
- Les captures sont packagées en fichier `.zip`
- Telechargees via `chrome.downloads` dans le dossier Downloads
- Le prompt clipboard reference le fichier telecharge
- Moins fluide mais zero installation supplementaire
