# Chrome Web Store Publishing Guide

## Prerequis

### Compte developpeur

1. Aller sur [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Payer les frais d'inscription : **$5 USD** (paiement unique)
3. Verifier l'identite (email + telephone)

### Assets requis

| Asset | Specs | Obligatoire |
|-------|-------|-------------|
| Icone extension | 128x128 PNG, fond transparent | Oui |
| Icone store | 128x128 PNG | Oui |
| Screenshot 1 | 1280x800 ou 640x400 PNG/JPEG | Oui (min 1) |
| Screenshot 2-5 | 1280x800 ou 640x400 PNG/JPEG | Recommande |
| Banniere promotionnelle | 440x280 PNG/JPEG | Non |
| Icone petite | 16x16, 32x32, 48x48 PNG | Oui (dans manifest) |

### Politique de confidentialite

Obligatoire. Page web accessible publiquement.

Option simple : page GitHub Pages dans le repo :
- `docs/privacy-policy.html` → publie via GitHub Pages
- URL : `https://oxyz-studio.github.io/PageNab/privacy-policy.html`

Contenu minimum :
- Quelles donnees sont collectees : aucune (tout est local)
- Quelles donnees sont partagees : aucune
- Comment les donnees sont stockees : fichiers locaux uniquement
- Contact : email support

## Build et packaging

```bash
# Build production
npm run build

# Generer le .zip pour le Store
npm run zip
# Produit : pagenab-v1.0.0.zip dans le dossier racine
```

## Soumission

### Etape 1 : Upload

1. Dashboard > New Item
2. Upload le fichier `.zip`
3. Le dashboard parse le manifest et affiche les infos

### Etape 2 : Fiche descriptive

**Titre** : PageNab — Capture Web Context for AI

**Resume** (132 chars max) :
> Capture any web page (screenshot, console, DOM, network) in one click. Paste the context into any AI coding assistant.

**Description** :
```
PageNab captures the full context of any web page and formats it as a ready-to-paste prompt for AI coding assistants.

One click captures:
- Full page screenshot
- Console errors and warnings with stack traces
- Failed network requests with response bodies
- Clean DOM snapshot
- Auto-generated Playwright locators
- Page metadata (URL, viewport, user agent)

Works with any AI tool: Claude Code, Cursor, Windsurf, GitHub Copilot, ChatGPT, or any LLM.

All data stays local on your machine. No servers, no tracking, no analytics.

Open source: https://github.com/Oxyz-Studio/PageNab
```

**Categorie** : Developer Tools

**Langue** : English (primary), French

### Etape 3 : Permissions

Justifier chaque permission demandee :

| Permission | Justification |
|------------|--------------|
| `activeTab` | Access the current tab to capture DOM, console logs, and screenshot when user clicks the extension |
| `clipboardWrite` | Copy the formatted capture prompt to clipboard |
| `storage` | Store user preferences (capture settings, rotation policy) |
| `nativeMessaging` | Write capture files to local disk via Native Messaging Host |
| `notifications` | Show confirmation after successful capture |

### Etape 4 : Privacy practices

- **Single purpose** : "Capture web page context for AI coding assistants"
- **Data usage** : "The extension does not collect, transmit, or store any user data externally. All captured data is saved locally on the user's machine."
- **Remote code** : "No" (tout est bundle)
- **Permissions justification** : voir tableau ci-dessus

### Etape 5 : Review

- Soumettre pour review
- Delai : **1 a 7 jours** (generalement 1-2 jours pour les nouvelles extensions simples)
- Si rejet : corriger les points mentionnes et resoumettre

## Mises a jour

Meme processus que la soumission initiale :
1. Incrementer la version dans `package.json` et `manifest.json`
2. `npm run build && npm run zip`
3. Upload le nouveau .zip dans le Dashboard
4. Review (generalement plus rapide pour les mises a jour)

## Checklist pre-publication

- [ ] Build production sans erreurs
- [ ] Tests passes (unit + E2E)
- [ ] Icones generees (16, 32, 48, 128)
- [ ] Screenshots du store preparees (1280x800)
- [ ] Politique de confidentialite publiee
- [ ] Description EN + FR redigee
- [ ] Permissions minimales verifiees
- [ ] Pas de remote code
- [ ] Version dans manifest.json a jour
- [ ] README a jour avec lien Chrome Web Store
- [ ] LICENSE MIT presente
