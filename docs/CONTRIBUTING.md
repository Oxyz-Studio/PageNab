# Contributing to PageNab

Thank you for your interest in contributing to PageNab!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/PageNab.git`
3. Install dependencies: `npm install`
4. Start development: `npm run dev`
5. Load the extension in Chrome: `chrome://extensions` → Load unpacked → select `dist/`

## Development

```bash
npm run dev          # Hot reload development
npm run build        # Production build
npm run lint         # ESLint + Prettier
npm run typecheck    # TypeScript strict check
npm run test         # Unit tests
npm run test:e2e     # E2E tests
```

## Pull Requests

1. Create a branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `npm run test && npm run lint && npm run typecheck`
4. Commit with conventional commits: `feat(capture): add network error details`
5. Push and create a PR

### Commit Convention

```
feat(scope): description     # New feature
fix(scope): description      # Bug fix
refactor(scope): description # Code refactoring
docs(scope): description     # Documentation
test(scope): description     # Tests
chore(scope): description    # Maintenance
```

Scopes: `capture`, `popup`, `content`, `background`, `storage`, `mcp`, `clipboard`, `locators`

### PR Checklist

- [ ] Tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] No `any` types introduced
- [ ] Sensitive data sanitization maintained
- [ ] No network requests added (PageNab is local-only)

## Architecture

See `docs/ARCHITECTURE.md` for a detailed overview of the codebase.

## Code Style

- TypeScript strict mode (no `any`)
- React functional components with hooks
- Tailwind CSS for styling (no custom CSS)
- Conventional commits
- Files: components `PascalCase.tsx`, utilities `camelCase.ts`

## Reporting Issues

- Use GitHub Issues
- Include: browser version, OS, steps to reproduce
- Screenshots help!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
