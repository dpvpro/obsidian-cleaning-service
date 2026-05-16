## Development

### Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development build with esbuild (watch mode) |
| `npm run build` | Type-check with `tsc` then production build |
| `npm run lint` | Run ESLint on the project |
| `npm run version` | Bump version in manifest.json and versions.json |

### Release

1. Commit code changes.
2. Check version entry to `manifest.json` with the minimum Obsidian version.
3. Make release `npm version 1.7.2`.
4. Run `npm run build` to produce `main.js`.
5. Create a GitHub release with the `main.js`, `manifest.json`, and `styles.css` attached.

## History

First version of plugin was rewriten 15.07.2025
