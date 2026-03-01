# Implementation Steps

Guide d'implementation sequentiel pour PageNab.

## Etape 1 : Scaffolding

**Objectif** : projet Plasmo fonctionnel avec TypeScript, React, Tailwind.

- [ ] Init projet Plasmo (`npm create plasmo`)
- [ ] Configurer TypeScript strict
- [ ] Installer Tailwind CSS 4
- [ ] Importer le design system OSAIT (couleurs, typographie, composants de base)
- [ ] Configurer ESLint + Prettier
- [ ] Configurer Vitest
- [ ] Creer la structure de dossiers (`src/background/`, `src/content/`, `src/popup/`, etc.)
- [ ] Manifest V3 avec permissions minimales
- [ ] Verifier que `npm run dev` charge l'extension dans Chrome

**Livrable** : extension Chrome qui s'affiche dans la barre d'outils avec une icone et un popup vide.

## Etape 2 : Capture de base

**Objectif** : capturer screenshot + metadata en un clic.

- [ ] Background service worker : handler de message
- [ ] `chrome.tabs.captureVisibleTab()` pour le screenshot
- [ ] Collecte des metadata (URL, title, viewport, userAgent, timestamp)
- [ ] Assembler le CaptureBundle (types TypeScript)
- [ ] Popup : bouton "Nab this page" qui declenche la capture
- [ ] Notification de succes apres capture
- [ ] Tests unitaires pour les types et l'assemblage

**Livrable** : cliquer sur "Nab this page" capture un screenshot et les metadata.

## Etape 3 : Content Script — Console + Network

**Objectif** : capturer les logs console et les erreurs reseau.

- [ ] Content script : injection on-demand via `chrome.scripting.executeScript`
- [ ] Capture console : monkey-patch `console.*` + `window.onerror` + `window.onunhandledrejection`
- [ ] Capture network : `PerformanceObserver` + `performance.getEntriesByType('resource')`
- [ ] Sanitization des headers sensibles
- [ ] Format console.json et network.json conforme a la spec
- [ ] Communication content script → background via `chrome.runtime.sendMessage`
- [ ] Tests unitaires pour la sanitization et le formatage

**Livrable** : la capture inclut les logs console et les requetes reseau echouees.

## Etape 4 : Content Script — DOM Snapshot

**Objectif** : capturer un snapshot DOM nettoye.

- [ ] Extraction DOM : `document.documentElement.outerHTML`
- [ ] Nettoyage : retirer scripts, nettoyer passwords, limiter taille
- [ ] Format dom.html conforme a la spec
- [ ] Gestion de la taille (troncation intelligente a 500KB)
- [ ] Tests unitaires pour le nettoyage DOM

**Livrable** : la capture inclut un DOM snapshot nettoye.

## Etape 5 : Locators Playwright

**Objectif** : generer des locators Playwright pour les elements interactifs.

- [ ] Detection des elements interactifs (buttons, links, inputs, selects, etc.)
- [ ] Generation de locators par priorite : getByRole > getByTestId > getByText > getByLabel > CSS
- [ ] Score de confiance pour chaque locator
- [ ] Format locators.json conforme a la spec
- [ ] Tests unitaires pour la generation de locators

**Livrable** : la capture inclut des locators Playwright avec scores de confiance.

## Etape 6 : Selection d'element

**Objectif** : permettre a l'utilisateur de selectionner un element specifique.

- [ ] Mode selection : overlay CSS injecte dans la page
- [ ] Highlight au survol (border animee)
- [ ] Click pour selectionner l'element
- [ ] Capture du sous-arbre DOM de l'element selectionne
- [ ] Screenshot crop de l'element (bounding box)
- [ ] Mise a jour des metadata (hasSelectedElement, selectedElementSelector)
- [ ] Bouton toggle dans le popup pour activer/desactiver le mode selection
- [ ] Touche Echap pour annuler la selection

**Livrable** : l'utilisateur peut selectionner un element specifique avant de capturer.

## Etape 7 : Stockage local + Native Messaging Host

**Objectif** : ecrire les captures sur le disque local.

- [ ] Native Messaging Host (Node.js script)
- [ ] Protocole de communication (messages JSON avec prefixe taille)
- [ ] Ecriture des fichiers dans `~/.pagenab/captures/{id}/`
- [ ] Creation/mise a jour du symlink `latest`
- [ ] Rotation automatique (maxCaptures, maxAge, maxStorage)
- [ ] Script d'installation (`npx pagenab-host install`)
- [ ] Manifest Native Messaging (macOS, Linux, Windows)
- [ ] Mode fallback : telechargement .zip si Native Host absent
- [ ] Tests unitaires pour la rotation et l'ecriture

**Livrable** : les captures sont sauvegardees dans `~/.pagenab/` avec rotation automatique.

## Etape 8 : Prompt Clipboard

**Objectif** : generer et copier le prompt structure dans le clipboard.

- [ ] Generateur de prompt format hybrid (resume + chemins)
- [ ] Generateur de prompt format paths-only
- [ ] Generateur de prompt format full-inline
- [ ] Copie clipboard via `chrome.offscreen` + `navigator.clipboard.writeText`
- [ ] Setting pour choisir le format de prompt
- [ ] Tests unitaires pour chaque format de prompt

**Livrable** : apres capture, le prompt est copie dans le clipboard, pret a coller.

## Etape 9 : Popup UI complete

**Objectif** : interface utilisateur polie avec le design system.

- [ ] Design du popup avec le design system OSAIT
- [ ] Bouton principal "Nab this page" (avec raccourci clavier affiche)
- [ ] Toggle "Select element"
- [ ] Preview rapide de la derniere capture (miniature screenshot + resume)
- [ ] Lien vers les settings
- [ ] Page Settings : configuration stockage, format prompt, raccourci
- [ ] Animations et transitions fluides
- [ ] Etats : idle, capturing, success, error

**Livrable** : popup fonctionnel et poli.

## Etape 10 : MCP Server

**Objectif** : package npm `pagenab-mcp` pour les power users.

- [ ] Creer le package `pagenab-mcp` (dans `src/mcp/` ou package separe)
- [ ] Implementer le serveur stdio MCP
- [ ] Outils : get_latest_capture, get_capture_screenshot, get_capture_console, get_capture_network, get_capture_dom, get_capture_locators, list_captures
- [ ] Gestion des erreurs (pas de capture, fichier manquant, etc.)
- [ ] README d'installation pour Claude Code et Cursor
- [ ] Tests unitaires pour chaque outil MCP

**Livrable** : `npx pagenab-mcp` fonctionne comme serveur MCP.

## Etape 11 : Tests E2E

**Objectif** : tests end-to-end de l'extension complete.

- [ ] Setup Playwright pour tester l'extension Chrome
- [ ] Test : capture basique (screenshot + metadata)
- [ ] Test : capture complete (console + network + DOM + locators)
- [ ] Test : selection d'element
- [ ] Test : rotation du stockage
- [ ] Test : formats de prompt (hybrid, paths-only, full-inline)
- [ ] Test : mode fallback (sans Native Host)

**Livrable** : suite de tests E2E qui valide le workflow complet.

## Etape 12 : Publication

**Objectif** : publier sur Chrome Web Store et GitHub.

- [ ] Generer les icones (16, 32, 48, 128)
- [ ] Preparer les screenshots du Store (1280x800)
- [ ] Rediger la fiche Chrome Web Store (EN + FR)
- [ ] Publier la politique de confidentialite (GitHub Pages)
- [ ] Build production + zip
- [ ] Soumettre au Chrome Web Store
- [ ] Creer la release GitHub (v1.0.0)
- [ ] Mettre a jour le README avec le lien Chrome Web Store
- [ ] Post de lancement (GitHub, Reddit r/ClaudeAI, X/Twitter, HackerNews)

**Livrable** : PageNab disponible sur le Chrome Web Store.
