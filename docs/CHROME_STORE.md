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
URL : `https://oxyz-studio.github.io/PageNab/privacy-policy.html`

## Build et packaging

```bash
npm run build
npm run zip
```

## Soumission

### Fiche descriptive

**Titre** : PageNab — Capture Web Context for AI

**Resume** (132 chars max) :
> Capture any web page (screenshot, console, DOM, network, cookies, performance) in one click. Paste the context into any AI assistant.

**Description** :
```
PageNab captures the full context of any web page and puts it in your clipboard — screenshot + text data — ready to paste into any AI coding assistant.

One click captures:
- Full page or area screenshot (image attaches directly when pasting)
- Console errors and warnings with stack traces
- Failed and slow network requests
- Clean DOM snapshot
- Cookies and storage data (sanitized)
- User interactions (last clicks, scrolls)
- Performance metrics (Core Web Vitals, load times)
- Page metadata (URL, viewport, user agent)

Three capture presets:
- Light: errors + network summary (~500 tokens of text + screenshot image)
- Full: everything including DOM snapshot, cookies, storage, performance
- Custom: choose exactly what data to capture

Features:
- Screenshot pastes as an image (like a native screenshot)
- Capture history with re-copy, details, and delete
- Customizable keyboard shortcut for instant capture
- Area selection mode to capture specific page regions
- Sensitive data automatically sanitized (passwords, tokens, auth headers)

Works with any AI tool: Claude Code, Cursor, Windsurf, GitHub Copilot, ChatGPT, or any LLM.

All data stays local on your machine. No servers, no tracking, no analytics.

Open source: https://github.com/Oxyz-Studio/PageNab
```

**Categorie** : Developer Tools

**Langue** : English (primary), French

### Permissions

| Permission | Justification |
|------------|--------------|
| `activeTab` | Access the current tab to capture DOM, console logs, and screenshot when user clicks the extension |
| `clipboardWrite` | Copy page context (text + screenshot image) to clipboard |
| `storage` | Store user preferences and capture history locally |
| `downloads` | Save page screenshots to user's Downloads folder for persistence |
| `notifications` | Show confirmation after successful capture |
| `scripting` | Inject content script to collect page data (console, network, DOM, cookies, etc.) |

### Privacy practices

- **Single purpose** : "Capture web page context for AI coding assistants"
- **Data usage** : "The extension does not collect, transmit, or store any user data externally. Captured data is copied to clipboard, saved in Downloads, and stored in local extension storage for capture history. Sensitive data (passwords, tokens, auth headers, cookie values) is automatically sanitized."
- **Remote code** : "No"

### Review

- Delai : **1 a 7 jours** (generalement 1-2 jours)

## Checklist pre-publication

- [ ] Build production sans erreurs
- [ ] Tests passes (unit)
- [ ] Icones generees (16, 32, 48, 128)
- [ ] Screenshots du store preparees (1280x800)
- [ ] Politique de confidentialite publiee
- [ ] Description EN + FR redigee
- [ ] Permissions minimales verifiees
- [ ] Pas de remote code
- [ ] Version dans manifest.json a jour
- [ ] README a jour avec lien Chrome Web Store
- [ ] LICENSE MIT presente
