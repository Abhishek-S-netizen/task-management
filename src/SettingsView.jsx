import { useRef, useState } from 'react';
import { normalize } from './storage';
import { todayStr } from './dates';

export default function SettingsView({ data, update, replaceAll, store, sync, openModal }) {
  const [username, setUsername] = useState(data.settings.githubUsername);
  const [token, setToken] = useState(sync.token || '');
  const importRef = useRef(null);
  const { fileStatus, fileName } = store;

  const saveGitHub = (e) => {
    e.preventDefault();
    const u = username.trim();
    const t = token.trim();
    sync.updateToken(t);
    update((d) => ({
      ...d,
      settings: { ...d.settings, githubUsername: u },
      github: u === d.github.username ? d.github : { username: '', repos: [], calendar: null, fetchedAt: null },
    }));
    if (u) sync.refresh(u, t);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tasks-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = normalize(JSON.parse(await file.text()));
      openModal({
        title: 'Import backup?',
        message: `Replace all current data with "${file.name}" (${parsed.tasks.length} tasks, ${parsed.projects.length} folders)?`,
        confirmText: 'Replace data',
        danger: true,
        onConfirm: () => replaceAll(parsed),
      });
    } catch {
      openModal({
        title: 'Invalid backup file',
        message: "That file doesn't look like a valid tasks backup.",
      });
    }
  };

  const statusText = {
    linked: `Saving to ${fileName}`,
    'needs-permission': `${fileName} needs permission again`,
    error: `Couldn't write to ${fileName}`,
    none: 'Not linked to a file. Tasks are only saved inside the browser.',
    unsupported: 'This browser can’t save to a file. Use Edge or Chrome, or use Export below.',
  }[fileStatus];

  const unchanged =
    username.trim() === data.settings.githubUsername &&
    token.trim() === (sync.token || '');

  const currentTheme = data.settings.theme || 'terracotta';
  const setTheme = (theme) =>
    update((d) => ({ ...d, settings: { ...d.settings, theme } }));

  return (
    <div className="view">
      <header className="view-header">
        <h1>Settings</h1>
      </header>

      <div className="settings-grid">
        <div className="settings-col">
          <section className="card">
            <h2>Appearance</h2>
            <div className="theme-grid">
              <button
                type="button"
                className={`theme-option ${currentTheme === 'terracotta' ? 'selected' : ''}`}
                onClick={() => setTheme('terracotta')}
              >
                <div className="theme-swatches">
                  <span className="swatch" style={{ background: '#0c0d0e' }} />
                  <span className="swatch" style={{ background: '#ED8B55' }} />
                  <span className="swatch" style={{ background: '#454525' }} />
                </div>
                <div className="theme-meta">
                  <span className="theme-name">Olive & Terracotta</span>
                  <span className="subtle small">#0c0d0e · #ED8B55 · #454525</span>
                </div>
              </button>

              <button
                type="button"
                className={`theme-option ${currentTheme === 'forest' ? 'selected' : ''}`}
                onClick={() => setTheme('forest')}
              >
                <div className="theme-swatches">
                  <span className="swatch" style={{ background: '#60060C' }} />
                  <span className="swatch" style={{ background: '#EFCE2F' }} />
                  <span className="swatch" style={{ background: '#163A65' }} />
                </div>
                <div className="theme-meta">
                  <span className="theme-name">Scuderia Ferrari</span>
                  <span className="subtle small">#60060C · #EFCE2F · #163A65</span>
                </div>
              </button>
            </div>
          </section>

          <section className="card">
            <h2>Storage</h2>
            <p className="subtle">{statusText}</p>
            {fileStatus !== 'unsupported' && (
              <div className="row-gap" style={{ marginTop: 10 }}>
                {fileStatus === 'needs-permission' && (
                  <button className="btn primary" onClick={store.reconnect}>
                    Allow access
                  </button>
                )}
                <button className="btn" onClick={store.createFile}>
                  {fileStatus === 'none' ? 'Create tasks file' : 'Save to a new file'}
                </button>
                <button className="btn" onClick={store.openFile}>
                  Open existing file
                </button>
                {fileStatus !== 'none' && (
                  <button className="btn danger-text" onClick={store.unlinkFile}>
                    Unlink file
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="settings-col">
          <section className="card">
            <h2>GitHub</h2>
            <form className="settings-form" onSubmit={saveGitHub}>
              <div className="field-row">
                <label className="field-label">Username</label>
                <input
                  placeholder="GitHub username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-label="GitHub username"
                />
              </div>
              <div className="field-row">
                <label className="field-label">Personal Access Token (for GraphQL heatmap)</label>
                <input
                  type="password"
                  placeholder="ghp_… or github_pat_…"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  aria-label="GitHub Personal Access Token"
                />
              </div>
              <div className="row-gap">
                <button className="btn primary" type="submit" disabled={unchanged}>
                  Save GitHub settings
                </button>
              </div>
            </form>
            <p className="subtle small" style={{ marginTop: 8 }}>
              Your token is stored only inside Edge’s private local storage and is never written to your tasks file.
            </p>
          </section>

          <section className="card">
            <h2>Backup</h2>
            <p className="subtle" style={{ marginBottom: 10 }}>
              Download a snapshot of your tasks, folders, and notes or restore from a file.
            </p>
            <div className="row-gap">
              <button className="btn" onClick={exportData}>
                Export
              </button>
              <button className="btn" onClick={() => importRef.current?.click()}>
                Import
              </button>
              <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importData} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
