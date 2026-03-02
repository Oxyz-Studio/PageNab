# Wireframes

Wireframes textuels de l'interface popup PageNab V1.

## Ecran principal — Idle (Light/Full)

```
┌──────────────────────────────────┐
│  ◉ PageNab            🕓   ⚙️   │
│                                  │
│  Mode                            │
│  ┌──────────┬──────────┬───────┐ │
│  │○ Element │ ○ Area   │● Full │ │
│  └──────────┴──────────┴───────┘ │
│                                  │
│  Capture                         │
│  ┌──────────┬──────────┬───────┐ │
│  │ ● Light  │  ○ Full  │○ Cust.│ │
│  └──────────┴──────────┴───────┘ │
│                                  │
│  ┌──────────────────────────────┐│
│  │                              ││
│  │        Nab this page         ││
│  │                              ││
│  └──────────────────────────────┘│
│                                  │
│  ⌨️ Ctrl+Shift+N                 │
│                                  │
└──────────────────────────────────┘
```

## Ecran principal — Idle (Custom)

Quand le preset Custom est selectionne, les toggles de donnees apparaissent.

```
┌──────────────────────────────────┐
│  ◉ PageNab            🕓   ⚙️   │
│                                  │
│  Mode                            │
│  ┌──────────┬──────────┬───────┐ │
│  │○ Element │ ○ Area   │● Full │ │
│  └──────────┴──────────┴───────┘ │
│                                  │
│  Capture                         │
│  ┌──────────┬──────────┬───────┐ │
│  │ ○ Light  │  ○ Full  │● Cust.│ │
│  └──────────┴──────────┴───────┘ │
│                                  │
│  ☑ Console  ☑ Network  ☐ DOM    │
│  ☐ Cookies  ☐ Storage  ☐ Perf  │
│  ☐ Interactions                  │
│                                  │
│  ┌──────────────────────────────┐│
│  │        Nab this page         ││
│  └──────────────────────────────┘│
│                                  │
│  ⌨️ Ctrl+Shift+N                 │
│                                  │
└──────────────────────────────────┘
```

Console et Network sont coches par defaut en Custom.
Les toggles ne sont visibles QUE quand Custom est selectionne.

## Ecran principal — Idle avec derniere capture

```
┌──────────────────────────────────┐
│  ◉ PageNab            🕓   ⚙️   │
│                                  │
│  Mode                            │
│  ┌──────────┬──────────┬───────┐ │
│  │○ Element │ ○ Area   │● Full │ │
│  └──────────┴──────────┴───────┘ │
│                                  │
│  Capture                         │
│  ┌──────────┬──────────┬───────┐ │
│  │ ● Light  │  ○ Full  │○ Cust.│ │
│  └──────────┴──────────┴───────┘ │
│                                  │
│  ┌──────────────────────────────┐│
│  │        Nab this page         ││
│  └──────────────────────────────┘│
│                                  │
│  Last: app.example.com · 2min    │
│  ⌨️ Ctrl+Shift+N                 │
│                                  │
└──────────────────────────────────┘
```

## Ecran principal — Capturing

```
┌──────────────────────────────────┐
│  ◉ PageNab            🕓   ⚙️   │
│                                  │
│                                  │
│  ┌──────────────────────────────┐│
│  │                              ││
│  │       ◌  Nabbing...          ││
│  │                              ││
│  └──────────────────────────────┘│
│                                  │
│                                  │
└──────────────────────────────────┘
```

## Ecran principal — Success (full page)

```
┌──────────────────────────────────┐
│  ◉ PageNab            🕓   ⚙️   │
│                                  │
│  ✓ Copied to clipboard!         │
│                                  │
│  ┌──────────────────────────────┐│
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│  │ ░░░░░ screenshot mini ░░░░░ ││
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│  └──────────────────────────────┘│
│  app.example.com/dashboard       │
│  3 errors · 2 failed · DOM ✓    │
│                                  │
│  ┌──────────────────────────────┐│
│  │        Nab again              ││
│  └──────────────────────────────┘│
│                                  │
└──────────────────────────────────┘
```

## Ecran principal — Success (area)

```
┌──────────────────────────────────┐
│  ◉ PageNab            🕓   ⚙️   │
│                                  │
│  ✓ Copied to clipboard!         │
│                                  │
│  ┌─────────────┬────────────────┐│
│  │ ░░░░░░░░░░░ │ ░░░░░░░░░░░░ ││
│  │ ░ full page░ │ ░░ area ░░░░ ││
│  │ ░░░░░░░░░░░ │ ░░░░░░░░░░░░ ││
│  └─────────────┴────────────────┘│
│  app.example.com/dashboard       │
│  3 errors · 2 failed · DOM ✓    │
│                                  │
│  ┌──────────────────────────────┐│
│  │        Nab again              ││
│  └──────────────────────────────┘│
│                                  │
└──────────────────────────────────┘
```

## Ecran principal — Success (element)

```
┌──────────────────────────────────┐
│  ◉ PageNab            🕓   ⚙️   │
│                                  │
│  ✓ Copied to clipboard!         │
│                                  │
│  ┌──────────────────────────────┐│
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│  │ ░░░░ element screenshot ░░░ ││
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│  └──────────────────────────────┘│
│  app.example.com/dashboard       │
│  🎯 h2.title · 3 errors         │
│                                  │
│  [Copy text]  [Screenshot]       │
│  [Copy full page screenshot]     │
│                                  │
│  ┌──────────────────────────────┐│
│  │        Nab again              ││
│  └──────────────────────────────┘│
│                                  │
└──────────────────────────────────┘
```

Le screenshot principal montre l'element capture (crop). Un bouton supplementaire permet de copier le screenshot full page.

## Ecran principal — Success (page saine, Full preset)

```
┌──────────────────────────────────┐
│  ◉ PageNab            🕓   ⚙️   │
│                                  │
│  ✓ Copied to clipboard!         │
│                                  │
│  ┌──────────────────────────────┐│
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│  │ ░░░░░ screenshot mini ░░░░░ ││
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│  └──────────────────────────────┘│
│  app.example.com/dashboard       │
│  0 errors · 45 req · DOM ✓      │
│  🍪 12 · 📦 8 keys · ⚡ LCP 1.2s│
│                                  │
│  ┌──────────────────────────────┐│
│  │        Nab again              ││
│  └──────────────────────────────┘│
│                                  │
└──────────────────────────────────┘
```

Ligne de stats additionnelle quand cookies/storage/perf sont captures.

## Ecran principal — Error

```
┌──────────────────────────────────┐
│  ◉ PageNab            🕓   ⚙️   │
│                                  │
│  ✗ Capture failed                │
│  Cannot access this page         │
│  (chrome:// pages are blocked)   │
│                                  │
│  ┌──────────────────────────────┐│
│  │        Try again              ││
│  └──────────────────────────────┘│
│                                  │
└──────────────────────────────────┘
```

## Overlay Area Selection (sur la page, popup ferme)

```
┌─────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░ OVERLAY SEMI-OPAQUE ░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░┌─────────────────────┐░░░░░░░░░░░░░ │
│ ░░░░░░│                     │░░░░░░░░░░░░░ │
│ ░░░░░░│   ZONE SELECTIONNEE │░░░░░░░░░░░░░ │
│ ░░░░░░│     (claire)        │░░░░░░░░░░░░░ │
│ ░░░░░░│                     │░░░░░░░░░░░░░ │
│ ░░░░░░└─────────────────────┘░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Draw a rectangle · Esc to cancel   │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘

Curseur : crosshair (+)
Click + drag = dessine le rectangle
Relache = capture se declenche
Esc = annule et retire l'overlay
```

## History — Liste

```
┌──────────────────────────────────┐
│  ←  History                      │
│                                  │
│  ┌──────────────────────────────┐│
│  │ ░░ mini ░░  app.example.com  ││
│  │ ░░░░░░░░░  14:30 · 3 errors ││
│  │  Full · DOM ✓ · 🍪           ││
│  │          [Copy] [Details]  ✕ ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │ ░░ mini ░░  dashboard.co     ││
│  │ ░░░░░░░░░  14:23 · 0 errors ││
│  │  Light                        ││
│  │          [Copy] [Details]  ✕ ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │ ░░ mini ░░  docs.example.com ││
│  │ ░░░░░░░░░  13:45 · 1 error  ││
│  │  Custom · DOM ✓ · ⚡          ││
│  │          [Copy] [Details]  ✕ ││
│  └──────────────────────────────┘│
│                                  │
│  20 captures · 1.8 MB used       │
│                                  │
└──────────────────────────────────┘
```

Chaque carte affiche le preset utilise + les badges des donnees capturees.

## History — Details

```
┌──────────────────────────────────┐
│  ← app.example.com              │
│  2026-03-01 14:30 · Full preset  │
│                                  │
│  ┌──────────────────────────────┐│
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│  │ ░░░░░░░ screenshot ░░░░░░░░ ││
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│  └──────────────────────────────┘│
│                                  │
│  Console  3 errors · 1 warning   │
│  ▸ TypeError: Cannot read 'map'  │
│  ▸ ReferenceError: data is not…  │
│  ▸ 404: /api/users/avatar/123    │
│  ▸ ⚠ Each child should have…     │
│                                  │
│  Network  2 failed · 1 slow      │
│  ▸ /api/users → 500 (fetch)     │
│  ▸ /api/stats → 403 (fetch)     │
│  ▸ 🐌 /api/analytics 5.2s (fetch)│
│                                  │
│  DOM  ✓ captured (125 KB)        │
│                                  │
│  Cookies  12 cookies             │
│  ▸ session_id: abc1***           │
│  ▸ theme: dark                   │
│  ▸ lang: fr                      │
│                                  │
│  Storage  8 keys                 │
│  ▸ localStorage: 5 keys          │
│  ▸ sessionStorage: 3 keys        │
│                                  │
│  Performance                     │
│  LCP: 1.2s · CLS: 0.05 · FID: 45ms│
│  Load: 2.1s · Memory: 45 MB     │
│                                  │
│  Interactions  12 events         │
│  ▸ click button.submit (14:29:58)│
│  ▸ scroll 450px (14:29:55)       │
│  ▸ input input#search (14:29:50) │
│                                  │
│  ┌──────────────────────────────┐│
│  │      Copy to clipboard        ││
│  └──────────────────────────────┘│
│                                  │
└──────────────────────────────────┘
```

Les sections n'apparaissent que si les donnees ont ete capturees.
Les ▸ sont expandables (stack traces, response bodies, valeurs completes).

## Settings

```
┌──────────────────────────────────┐
│  ←  Settings                     │
│                                  │
│  Clipboard mode                  │
│  ┌──────────┬──────────┬───────┐ │
│  │ ○ Text   │ ● Both   │○ Image│ │
│  └──────────┴──────────┴───────┘ │
│                                  │
│  Notifications           [ ON ]  │
│                                  │
│  Keyboard shortcut               │
│  Ctrl+Shift+N                    │
│  Change via chrome://extensions  │
│  /shortcuts                      │
│                                  │
│  History                         │
│  Max captures             [ 20 ] │
│                                  │
│─────────────────────────────────│
│  v1.0.0 · MIT · GitHub ↗        │
└──────────────────────────────────┘
```

Le raccourci est gere via `chrome.commands` (API native MV3). L'utilisateur peut le modifier via `chrome://extensions/shortcuts`. Settings affiche le raccourci actuel en lecture seule.

## Flow raccourci clavier (sans popup)

```
Ctrl+Shift+N (ou raccourci modifie via chrome://extensions/shortcuts)
     │
     ├─ Mode "Full page" → capture directe avec le preset actif
     │       │
     │       ▼
     │   ┌─────────────────────────────┐
     │   │ 🔔 PageNab                  │
     │   │ Captured! Paste in your AI. │
     │   │ app.example.com · 3 errors  │
     │   └─────────────────────────────┘
     │
     ├─ Mode "Area" → overlay apparait sur la page
     │       │
     │       ▼
     │   Utilisateur dessine rectangle → capture
     │       │
     │       ▼
     │   ┌─────────────────────────────┐
     │   │ 🔔 PageNab                  │
     │   │ Captured! Paste in your AI. │
     │   │ app.example.com · 3 errors  │
     │   └─────────────────────────────┘
     │
     └─ Mode "Element" → overlay apparait sur la page
             │
             ▼
         Utilisateur survole et clique un element → capture
             │
             ▼
         ┌─────────────────────────────┐
         │ 🔔 PageNab                  │
         │ Captured! Paste in your AI. │
         │ app.example.com · 🎯 h2.title│
         └─────────────────────────────┘
```

Le raccourci respecte toujours le dernier preset + screenshot mode selectionnes.
