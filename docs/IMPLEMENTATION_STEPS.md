# Implementation Steps

Guide d'implementation sequentiel pour PageNab V1.

## Etape 1 : Scaffolding

**Objectif** : projet Plasmo fonctionnel avec TypeScript, React, Tailwind.

- [ ] Init projet Plasmo (`npm create plasmo`)
- [ ] Configurer TypeScript strict
- [ ] Installer Tailwind CSS 3.4
- [ ] Configurer ESLint + Prettier
- [ ] Configurer Vitest
- [ ] Creer la structure de dossiers (`src/background/`, `src/content/`, `src/popup/`, `src/lib/`)
- [ ] Manifest V3 avec permissions (`activeTab`, `clipboardWrite`, `storage`, `downloads`, `notifications`, `scripting`)
- [ ] Verifier que `npm run dev` charge l'extension dans Chrome

**Livrable** : extension Chrome qui s'affiche dans la barre d'outils avec une icone et un popup vide.

## Etape 2 : Types et capture de base (screenshot + metadata)

**Objectif** : capturer screenshot + metadata en un clic.

- [ ] Types TypeScript : `CaptureBundle`, `Metadata`, `StoredCapture`, `Settings`, `Preset`, messages Chrome (discriminated unions)
- [ ] Type `Preset` : `'light' | 'full' | 'custom'` avec `CustomOptions` (toggles par donnee)
- [ ] Background service worker : handler de message principal
- [ ] `chrome.tabs.captureVisibleTab()` pour le screenshot
- [ ] Collecte des metadata (URL, title, viewport, userAgent, timestamp, language, colorScheme, preset, capturedData)
- [ ] Assembler le CaptureBundle
- [ ] Sauvegarde screenshot via `chrome.downloads.download({ saveAs: false })`
- [ ] Popup : bouton "Nab this page" (pleine largeur) qui declenche la capture
- [ ] Etats du popup : idle, capturing (spinner), success (miniature + resume), error
- [ ] Notification de succes apres capture
- [ ] Tests unitaires pour les types et l'assemblage

**Livrable** : cliquer sur "Nab this page" capture un screenshot et les metadata.

## Etape 3 : Content Script — Console + Network

**Objectif** : capturer les logs console et les erreurs reseau.

- [ ] Content script : injection on-demand via `chrome.scripting.executeScript`
- [ ] Capture console : monkey-patch `console.*` + `window.onerror` + `window.onunhandledrejection`
- [ ] Capture network : `PerformanceObserver` + `performance.getEntriesByType('resource')`
- [ ] Sanitization des headers sensibles (Authorization, Cookie, tokens)
- [ ] Format console et network conforme a la spec CAPTURE_FORMAT.md
- [ ] Logic preset : Light = errors+warnings + failed only | Full = all levels + failed+slow
- [ ] Communication content script → background via `chrome.runtime.sendMessage`
- [ ] Tests unitaires pour la sanitization et le formatage

**Livrable** : la capture inclut les logs console et les requetes reseau echouees/lentes.

## Etape 4 : Content Script — DOM + Cookies + Storage + Performance

**Objectif** : capturer les donnees conditionnelles (selon le preset).

- [ ] DOM : extraction `document.documentElement.outerHTML`, nettoyage (scripts, passwords, commentaires), troncation 500KB
- [ ] Cookies : lecture `document.cookie`, sanitization (valeurs tronquees, cookies sensibles masques)
- [ ] Storage : lecture `localStorage` + `sessionStorage`, sanitization (cles sensibles, valeurs tronquees a 200 chars)
- [ ] Performance : `performance.getEntriesByType('navigation')`, `PerformanceObserver` (LCP, CLS, FID), `performance.memory`
- [ ] Chaque module n'est appele que si le preset l'exige
- [ ] Tests unitaires pour le nettoyage DOM, la sanitization cookies/storage, les metriques performance

**Livrable** : la capture inclut DOM, cookies, storage, et performance selon le preset.

## Etape 5 : Content Script — Interactions (persistent)

**Objectif** : tracker les dernieres interactions utilisateur.

- [ ] `interactions.ts` : content script persistant avec buffer circulaire de 50 events
- [ ] Ecoute : `click`, `scroll`, `input`, `change`
- [ ] Sanitization : valeurs d'inputs TOUJOURS masquees, pas de frappes clavier individuelles
- [ ] Bundling via Plasmo (`src/contents/interactions.ts` avec `PlasmoCSConfig`)
- [ ] Flag `pagenab_interactions_enabled` dans `chrome.storage.local` pour activer/desactiver le tracking
- [ ] Le background demande le buffer au content script via messaging lors de la capture
- [ ] Tests unitaires pour le buffer circulaire et la sanitization

**Livrable** : la capture inclut les dernieres interactions utilisateur (si le preset l'active).

## Etape 6 : Clipboard multi-format + Presets

**Objectif** : copier les donnees dans le clipboard en multi-format (text + image) selon le preset.

- [ ] Ecriture clipboard via injection dans la page active (`chrome.scripting.executeScript` + `navigator.clipboard.write`)
- [ ] Ecriture multi-format : `ClipboardItem` avec `text/plain` + `image/png`
- [ ] Generateur de texte Light (metadata + console errors/warnings + network failed)
- [ ] Generateur de texte Full (metadata + console all + network all + cookies + storage + perf + interactions + DOM)
- [ ] Generateur de texte Custom (sections presentes selon les toggles)
- [ ] Inclusion du chemin screenshot dans le texte
- [ ] Switches sur l'ecran principal du popup : screenshot mode (full page / area) + preset (Light / Full / Custom)
- [ ] Checkboxes donnees (visibles uniquement en Custom) : Console, Network, DOM, Cookies, Storage, Interactions, Performance
- [ ] Persistance des settings dans `chrome.storage.local`
- [ ] Tests unitaires pour chaque format de texte et l'assemblage ClipboardItem

**Livrable** : apres capture, le clipboard contient texte + image. Coller attache l'image directement.

## Etape 7 : Area Capture

**Objectif** : permettre de selectionner une zone rectangulaire de la page.

- [ ] `area-selector.ts` : overlay semi-opaque injecte dans la page
- [ ] Curseur crosshair, barre d'instructions en bas ("Draw a rectangle · Esc to cancel")
- [ ] Gestion click + drag pour dessiner le rectangle
- [ ] Zone selectionnee : claire (non opaque), reste : overlay sombre
- [ ] Esc pour annuler (retire l'overlay, annule la capture)
- [ ] Relacher le clic = capture se declenche avec les coordonnees
- [ ] Background : crop du screenshot full page avec canvas offscreen
- [ ] Sauvegarde des deux screenshots (full + area) via chrome.downloads
- [ ] Clipboard : image/png = area screenshot (plus pertinent), texte mentionne les deux fichiers
- [ ] Le popup se ferme quand le mode area est declenche
- [ ] Tests unitaires pour le calcul des coordonnees et le crop

**Livrable** : l'utilisateur peut dessiner une zone. Le clipboard contient la zone + texte.

## Etape 8 : Historique

**Objectif** : stocker et consulter les captures precedentes.

- [ ] `history.ts` (background) : CRUD captures dans `chrome.storage.local`
- [ ] Sauvegarde automatique apres chaque capture (thumbnail + donnees completes capturees)
- [ ] Generation de la miniature screenshot (~50KB, redimensionnee)
- [ ] Respect de la limite `maxCaptures` (suppression des plus anciennes)
- [ ] Chaque capture stocke le preset utilise + la liste `capturedData`
- [ ] Ecran History dans le popup : liste scrollable avec miniature + domaine + heure + resume + preset + badges donnees
- [ ] Bouton Copy : re-genere le texte (avec le preset actuel, limite aux donnees capturees) + charge l'image depuis Downloads → clipboard multi-format
- [ ] Bouton Details : affiche la vue detaillee (screenshot, console, network, DOM stats, cookies, storage, interactions, perf)
- [ ] Bouton ✕ : supprime la capture de l'historique
- [ ] Compteur en bas : "N captures · X.X MB used"

**Livrable** : l'utilisateur peut consulter, re-copier et supprimer ses captures passees.

## Etape 9 : Raccourci clavier custom + UI complete + Settings

**Objectif** : raccourci clavier configurable + interface utilisateur polie.

- [ ] Raccourci clavier via `chrome.commands` (declare dans le manifest)
- [ ] Listener `chrome.commands.onCommand` dans le background service worker
- [ ] Settings : affichage du raccourci (lecture seule) + lien vers `chrome://extensions/shortcuts`
- [ ] Le raccourci respecte le dernier mode (full page = capture directe, area = overlay) et le dernier preset
- [ ] Notification Chrome apres capture (domaine + nombre erreurs)
- [ ] Valeur par defaut : Ctrl+Shift+N (Cmd+Shift+N sur macOS)
- [ ] Design du popup avec Tailwind CSS (design neutre)
- [ ] Ecran principal : preset selector + switches + bouton + derniere capture + hint raccourci
- [ ] Header : logo PageNab + icones history et settings
- [ ] Etats : idle, idle avec derniere capture, idle Custom (avec checkboxes), capturing, success, success area (2 miniatures), error
- [ ] Page Settings : notifications on/off, raccourci clavier (affichage + lien chrome://extensions/shortcuts), max captures (input)
- [ ] Animations et transitions fluides
- [ ] Footer settings : version + licence + lien GitHub

**Livrable** : popup fonctionnel et poli avec tous les ecrans + raccourci operationnel.

## Etape 10 : Publication

**Objectif** : publier sur Chrome Web Store et GitHub.

- [ ] Generer les icones (16, 32, 48, 128)
- [ ] Preparer les screenshots du Store (1280x800)
- [ ] Rediger la fiche Chrome Web Store (EN + FR)
- [ ] Publier la politique de confidentialite (GitHub Pages)
- [ ] Build production + zip
- [ ] Soumettre au Chrome Web Store
- [ ] Creer la release GitHub (v1.0.0)
- [ ] Mettre a jour le README avec le lien Chrome Web Store

**Livrable** : PageNab disponible sur le Chrome Web Store.

## Etapes V2 (futur)

- **Element Selector** : selection visuelle basee sur le DOM, capture sous-arbre + screenshot crop
- **Native Messaging Host** : ecriture `~/.pagenab/`, rotation automatique, symlink `latest`
- **MCP Server** : package `pagenab-mcp` pour Claude Code / Cursor
- **Locators Playwright** : generation automatique de locators
- **Tests E2E** : suite de tests pour valider le workflow complet
