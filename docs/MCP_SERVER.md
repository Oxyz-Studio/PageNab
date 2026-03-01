# MCP Server Specification

## Vue d'ensemble

Le MCP server PageNab est un package npm **optionnel** (`pagenab-mcp`) qui expose les captures locales comme outils MCP, permettant a Claude Code, Cursor, ou tout client MCP d'acceder directement aux donnees sans lecture manuelle de fichiers.

## Pourquoi un MCP server ?

| Sans MCP | Avec MCP |
|----------|----------|
| L'utilisateur colle le prompt | L'AI appelle les outils directement |
| L'AI doit faire des `Read` tool calls | L'AI recoit les donnees structurees |
| Fonctionne partout | Necessite une config MCP |
| Zero installation | `npx pagenab-mcp` a configurer |

Le MCP server est un **bonus pour power users**, pas un prerequis.

## Installation

### Configuration Claude Code

```bash
claude mcp add --transport stdio pagenab -- npx pagenab-mcp
```

Ou manuellement dans `.mcp.json` :

```json
{
  "mcpServers": {
    "pagenab": {
      "command": "npx",
      "args": ["pagenab-mcp"],
      "env": {
        "PAGENAB_DIR": "~/.pagenab"
      }
    }
  }
}
```

### Configuration Cursor

Dans Cursor Settings > MCP Servers, ajouter :

```json
{
  "pagenab": {
    "command": "npx",
    "args": ["pagenab-mcp"]
  }
}
```

## Outils exposes

### `get_latest_capture`

Retourne les metadata + resume de la derniere capture.

**Parametres** : aucun

**Retour** :
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"url\": \"https://app.example.com/dashboard\",\n  \"timestamp\": \"2026-03-01T14:23:45.123Z\",\n  \"console\": { \"errors\": 3, \"warnings\": 1 },\n  \"network\": { \"failed\": 2 },\n  \"hasSelectedElement\": true,\n  \"files\": [\"screenshot.png\", \"element.png\", \"console.json\", ...]\n}"
    }
  ]
}
```

### `get_capture_screenshot`

Retourne le screenshot pleine page ou de l'element selectionne.

**Parametres** :
| Nom | Type | Defaut | Description |
|-----|------|--------|-------------|
| `type` | `"page" \| "element"` | `"page"` | Type de screenshot |
| `captureId` | `string?` | latest | ID de la capture (timestamp_domain) |

**Retour** :
```json
{
  "content": [
    {
      "type": "image",
      "data": "<base64-encoded-png>",
      "mimeType": "image/png"
    }
  ]
}
```

### `get_capture_console`

Retourne les logs console complets.

**Parametres** :
| Nom | Type | Defaut | Description |
|-----|------|--------|-------------|
| `level` | `"all" \| "error" \| "warning" \| "log"` | `"all"` | Filtrer par niveau |
| `captureId` | `string?` | latest | ID de la capture |

**Retour** : contenu de `console.json` filtre.

### `get_capture_network`

Retourne les requetes reseau echouees/lentes.

**Parametres** :
| Nom | Type | Defaut | Description |
|-----|------|--------|-------------|
| `filter` | `"all" \| "failed" \| "slow"` | `"all"` | Type de requetes |
| `captureId` | `string?` | latest | ID de la capture |

**Retour** : contenu de `network.json` filtre.

### `get_capture_dom`

Retourne le DOM snapshot.

**Parametres** :
| Nom | Type | Defaut | Description |
|-----|------|--------|-------------|
| `captureId` | `string?` | latest | ID de la capture |

**Retour** : contenu de `dom.html`.

### `get_capture_locators`

Retourne les locators Playwright generes.

**Parametres** :
| Nom | Type | Defaut | Description |
|-----|------|--------|-------------|
| `minConfidence` | `number` | `0.5` | Score de confiance minimum |
| `captureId` | `string?` | latest | ID de la capture |

**Retour** : contenu de `locators.json` filtre par confiance.

### `list_captures`

Liste toutes les captures disponibles.

**Parametres** :
| Nom | Type | Defaut | Description |
|-----|------|--------|-------------|
| `limit` | `number` | `10` | Nombre max de captures |

**Retour** :
```json
{
  "content": [
    {
      "type": "text",
      "text": "[\n  { \"id\": \"2026-03-01_14-30-12_dashboard.example.com\", \"url\": \"...\", \"timestamp\": \"...\", \"isLatest\": true },\n  { \"id\": \"2026-03-01_14-23-45_app.example.com\", \"url\": \"...\", \"timestamp\": \"...\", \"isLatest\": false }\n]"
    }
  ]
}
```

## Implementation technique

### Transport

**stdio** uniquement. Le serveur est lance comme processus enfant par Claude Code / Cursor.

### Dependances

- `@modelcontextprotocol/sdk` : SDK MCP officiel
- `fs/promises` : lecture des fichiers de capture
- `path` : resolution des chemins

Pas de dependance lourde. Le package doit rester leger (< 1MB installe).

### Gestion des erreurs

| Erreur | Reponse MCP |
|--------|------------|
| Pas de capture disponible | `{ "content": [{ "type": "text", "text": "No captures found in ~/.pagenab/" }] }` |
| Fichier manquant | `{ "content": [{ "type": "text", "text": "File not found: screenshot.png" }] }` |
| Capture corrompue | `{ "content": [{ "type": "text", "text": "Capture corrupted: invalid metadata.json" }] }` |
| Repertoire inexistant | `{ "content": [{ "type": "text", "text": "PageNab directory not found. Install PageNab first." }] }` |

### Taille des reponses

- Screenshots : limites a 1MB (redimensionnes si necessaire)
- DOM : limite a 500KB
- Console/Network : pas de limite (deja capes a la capture)
