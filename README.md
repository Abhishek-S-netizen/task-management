# Tasks

A simple offline to-do app with project folders and a list of your GitHub repos.
It saves everything to a `tasks.json` file on your computer (Edge / Chrome).

## Run it

```
npm install
npm run dev        # development, opens http://localhost:5173
```

## Install it as an app

```
npm run build
npm run preview    # http://localhost:4173
```

Open http://localhost:4173 in Edge and click the **Install** icon in the address bar.
After that the app opens in its own window and works offline, even when the preview server is not running.

## Where data lives

- **Main copy:** the `tasks.json` file you pick (Settings → Storage)
- **Backup copy:** inside the browser, in case the file is unavailable
- **Export / Import:** Settings → Backup
