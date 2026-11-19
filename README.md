# Tasks

An offline-first personal task manager, notes workspace, and GitHub repository tracker built as an installable Progressive Web App (PWA).

## Features

- **Tasks & Today view:** Create, edit, complete, and schedule tasks with custom date and time pickers.
- **Project folders:** Group related tasks into collapsible folders and link them to GitHub repositories.
- **Completion analytics:** Track pending, daily, and weekly progress alongside a Weekly / Monthly completion bar chart.
- **Notes:** Dedicated split-view notepad with search, pinning, folder tags, and instant auto-save.
- **GitHub integration:** Browse public repositories by activity status (Active / Quiet) and view your official GitHub GraphQL contribution heatmap offline.
- **Local disk storage:** Save data directly to a `tasks.json` file on disk via the File System Access API (Edge / Chrome), with an automatic IndexedDB fallback and JSON export/import.
- **Themes:** Switch between Olive & Terracotta and Scuderia Ferrari palettes in Settings.

## Tech Stack

- React 18 + Vite
- IndexedDB (`idb-keyval`) + File System Access API
- GitHub REST & GraphQL APIs
- `vite-plugin-pwa` (Workbox service worker & web app manifest)

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```
