# MCP Server Specification (V2)

> **Note** : le MCP Server est prevu pour la V2 de PageNab. Il necessite un stockage local structure (`~/.pagenab/`) qui sera implemente via Native Messaging Host en V2.

## Vue d'ensemble

Le MCP server PageNab sera un package npm optionnel (`pagenab-mcp`) qui expose les captures locales comme outils MCP, permettant a Claude Code, Cursor, ou tout client MCP d'acceder directement aux donnees sans lecture manuelle de fichiers.

## Pourquoi un MCP server ?

| Sans MCP | Avec MCP |
|----------|----------|
| L'utilisateur colle le prompt | L'AI appelle les outils directement |
| L'AI doit faire des `Read` tool calls | L'AI recoit les donnees structurees |
| Fonctionne partout | Necessite une config MCP |
| Zero installation | `npx pagenab-mcp` a configurer |

Le MCP server est un **bonus pour power users**, pas un prerequis.

## Prerequis V2

Le MCP server necessite :
1. **Native Messaging Host** : pour ecrire les captures dans `~/.pagenab/`
2. **Structure de dossiers** : captures organisees dans `~/.pagenab/captures/`
3. **Symlink `latest`** : pour pointer sur la derniere capture

Sans ces elements, le MCP server n'a pas de source de donnees a lire.

## Installation prevue

### Configuration Claude Code

```bash
claude mcp add --transport stdio pagenab -- npx pagenab-mcp
```

### Configuration Cursor

```json
{
  "pagenab": {
    "command": "npx",
    "args": ["pagenab-mcp"]
  }
}
```

## Outils prevus

| Outil | Description |
|-------|-------------|
| `get_latest_capture` | Metadata + resume de la derniere capture |
| `get_capture_screenshot` | Screenshot PNG (base64) |
| `get_capture_console` | Logs console (filtrable par niveau) |
| `get_capture_network` | Requetes reseau (filtrable : failed/slow) |
| `get_capture_dom` | DOM snapshot HTML |
| `list_captures` | Liste des captures disponibles |

## Dependances prevues

- `@modelcontextprotocol/sdk` : SDK MCP officiel
- `fs/promises` : lecture des fichiers de capture
- `path` : resolution des chemins

Package leger : < 1MB installe.
