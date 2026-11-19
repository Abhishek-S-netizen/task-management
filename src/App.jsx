import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './useStore';
import { getToken, setToken as saveBrowserToken } from './storage';
import { fetchRepos, fetchContributionCalendar } from './github';
import { todayStr, toDateStr, timeAgo } from './dates';
import TaskList from './TaskList';
import GitHubView, { RepoStatus, GitHubStatsPanel } from './GitHubView';
import SettingsView from './SettingsView';
import { Select } from './Pickers';
import StatsPanel from './StatsPanel';
import Modal from './Modal';
import { NotesListPane, NoteEditorPane } from './NotesView';

/* ---------------- GitHub refresh (only part that needs internet) ---------------- */

function useGitHubSync(data, update) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [token, setTokenState] = useState(() => getToken());
  const username = data?.settings.githubUsername;

  const updateToken = useCallback((nextToken) => {
    saveBrowserToken(nextToken);
    setTokenState(nextToken);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const refresh = useCallback(
    async (name, tok) => {
      const u = name ?? username;
      const t = tok ?? token;
      if (!u) return;
      setLoading(true);
      setError('');
      try {
        const [repos, calendar] = await Promise.all([
          fetchRepos(u, t),
          t ? fetchContributionCalendar(u, t) : Promise.resolve(null),
        ]);
        update((d) => ({
          ...d,
          github: {
            username: u,
            repos,
            calendar: calendar ?? d.github.calendar ?? null,
            fetchedAt: new Date().toISOString(),
          },
        }));
      } catch (err) {
        setError(navigator.onLine ? err.message : 'You are offline. Showing the last saved list.');
      } finally {
        setLoading(false);
      }
    },
    [username, token, update],
  );

  // Refresh automatically once per launch if the saved list is over an hour old.
  const didAuto = useRef(false);
  useEffect(() => {
    if (!data || didAuto.current) return;
    didAuto.current = true;
    const g = data.github;
    const stale =
      !g.fetchedAt ||
      g.username !== username ||
      (token && !g.calendar) ||
      Date.now() - new Date(g.fetchedAt).getTime() > 3600000;
    if (username && navigator.onLine && stale) refresh();
  }, [data, username, token, refresh]);

  return { loading, error, online, token, updateToken, refresh };
}

/* ---------------- Small pieces ---------------- */

function StorageBanner({ store }) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('banner-dismissed') === '1');
  const { fileStatus, fileName } = store;

  if (fileStatus === 'needs-permission')
    return (
      <div className="banner">
        <span>Edge needs your OK to keep saving to {fileName}.</span>
        <button className="btn primary" onClick={store.reconnect}>
          Allow
        </button>
      </div>
    );
  if (fileStatus === 'error')
    return (
      <div className="banner error">
        <span>Couldn’t save to {fileName}. Was it moved or deleted?</span>
        <button className="btn" onClick={store.reconnect}>
          Try again
        </button>
        <button className="btn" onClick={store.createFile}>
          Choose new file
        </button>
      </div>
    );
  if (fileStatus === 'none' && !dismissed)
    return (
      <div className="banner">
        <span>Your tasks are only saved inside the browser. Pick a file on your computer to keep them safe.</span>
        <button className="btn primary" onClick={store.createFile}>
          Create tasks file
        </button>
        <button className="btn" onClick={store.openFile}>
          Open existing
        </button>
        <button
          className="icon-btn"
          aria-label="Dismiss"
          title="Dismiss"
          onClick={() => {
            sessionStorage.setItem('banner-dismissed', '1');
            setDismissed(true);
          }}
        >
          ✕
        </button>
      </div>
    );
  return null;
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          className="link-btn"
          onClick={() => {
            toast.undo();
            onClose();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}

/* ---------------- Full Folders Overview Page ---------------- */

function FoldersView({ data, update, onOpenProject }) {
  const [name, setName] = useState('');
  const [repo, setRepo] = useState('');

  const repoOptions = [
    { value: '', label: 'No repo linked' },
    ...data.github.repos.map((r) => ({ value: r.name, label: r.name })),
  ];

  const create = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const p = {
      id: crypto.randomUUID(),
      name: name.trim(),
      repo: repo || null,
      createdAt: Date.now(),
    };
    update((d) => ({ ...d, projects: [...d.projects, p] }));
    setName('');
    setRepo('');
  };

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <h1>Folders</h1>
          <p className="subtle">
            {data.projects.length} {data.projects.length === 1 ? 'folder' : 'folders'}
          </p>
        </div>
      </header>

      <form className="add-task folder-create-card" onSubmit={create}>
        <input
          className="add-title"
          placeholder="New folder name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="New folder name"
        />
        <div className="add-row">
          {data.github.repos.length > 0 && (
            <Select
              value={repo}
              onChange={setRepo}
              options={repoOptions}
              placeholder="No repo linked"
              ariaLabel="Link GitHub repo"
            />
          )}
          <button className="btn primary" type="submit" disabled={!name.trim()}>
            Create folder
          </button>
        </div>
      </form>

      {data.projects.length === 0 ? (
        <p className="empty">No folders yet. Create one above to group related tasks.</p>
      ) : (
        <div className="folder-grid">
          {data.projects.map((p) => {
            const pTasks = data.tasks.filter((t) => t.projectId === p.id);
            const doneCount = pTasks.filter((t) => t.done).length;
            const openCount = pTasks.length - doneCount;
            const pct = pTasks.length > 0 ? Math.round((doneCount / pTasks.length) * 100) : 0;
            const linkedRepo = p.repo ? data.github.repos.find((r) => r.name === p.repo) : null;

            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                className="folder-card"
                onClick={() => onOpenProject(p.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenProject(p.id)}
              >
                <div className="folder-card-top">
                  <div className="folder-card-icon">
                    <svg viewBox="0 0 20 20" width="18" height="18">
                      <path
                        d="M2.5 5.5A1.8 1.8 0 0 1 4.3 3.7h3.6l1.7 1.9h6.1a1.8 1.8 0 0 1 1.8 1.8v7.1a1.8 1.8 0 0 1-1.8 1.8H4.3a1.8 1.8 0 0 1-1.8-1.8z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="folder-card-count">
                    {openCount} open · {doneCount} done
                  </span>
                </div>

                <div className="folder-card-name">{p.name}</div>

                {linkedRepo ? (
                  <div className="folder-card-repo">
                    <RepoStatus repo={linkedRepo} />
                    <span>· {linkedRepo.name}</span>
                  </div>
                ) : (
                  <div className="folder-card-repo muted">No repo linked</div>
                )}

                <div className="folder-card-progress">
                  <div className="progress">
                    <div style={{ width: `${pct}%` }} />
                  </div>
                  <span className="folder-card-pct">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Single Project folder view ---------------- */

function ProjectView({ project, data, update, notify, openModal, onBack }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const repo = project.repo ? data.github.repos.find((r) => r.name === project.repo) : null;
  const tasks = data.tasks.filter((t) => t.projectId === project.id);
  const doneCount = tasks.filter((t) => t.done).length;

  const setProject = (changes) =>
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === project.id ? { ...p, ...changes } : p)) }));

  const rename = (e) => {
    e.preventDefault();
    if (name.trim()) setProject({ name: name.trim() });
    setRenaming(false);
  };

  const remove = () => {
    openModal({
      title: `Delete "${project.name}"?`,
      message:
        tasks.length === 0
          ? 'This folder is empty and will be removed.'
          : `Its ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} will be kept and moved out of the folder.`,
      confirmText: 'Delete folder',
      danger: true,
      onConfirm: () => {
        const snapshot = { project, taskIds: tasks.map((t) => t.id) };
        update((d) => ({
          ...d,
          projects: d.projects.filter((p) => p.id !== project.id),
          tasks: d.tasks.map((t) => (t.projectId === project.id ? { ...t, projectId: null } : t)),
        }));
        onBack();
        notify('Folder deleted', () =>
          update((d) => ({
            ...d,
            projects: [...d.projects, snapshot.project],
            tasks: d.tasks.map((t) => (snapshot.taskIds.includes(t.id) ? { ...t, projectId: project.id } : t)),
          })),
        );
      },
    });
  };

  const repoOptions = [
    { value: '', label: 'No repo linked' },
    ...data.github.repos.map((r) => ({ value: r.name, label: r.name })),
  ];

  return (
    <div className="view task-page-view">
      <div className="task-page-head">
        <div className="back-row">
          <button type="button" className="link-btn muted" onClick={onBack}>
            ← All folders
          </button>
        </div>

        <header className="project-header">
          <div className="project-title-row">
            <div className="grow">
              {renaming ? (
                <form onSubmit={rename}>
                  <input
                    className="title-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={rename}
                    autoFocus
                    aria-label="Folder name"
                  />
                </form>
              ) : (
                <h1 onDoubleClick={() => setRenaming(true)} title="Double-click to rename">
                  {project.name}
                </h1>
              )}
            </div>
            <div className="row-gap">
              <button className="btn small-btn" onClick={() => setRenaming(true)}>
                Rename
              </button>
              <button className="btn small-btn danger-text" onClick={remove}>
                Delete
              </button>
            </div>
          </div>

          <div className="project-meta-row">
            <span>{tasks.length === 0 ? 'No tasks yet' : `${doneCount} of ${tasks.length} done`}</span>

            {data.github.repos.length > 0 && (
              <>
                <span className="meta-sep">·</span>
                <Select
                  value={project.repo || ''}
                  onChange={(val) => setProject({ repo: val || null })}
                  options={repoOptions}
                  placeholder="Link GitHub repo"
                  ariaLabel="Linked GitHub repo"
                />
              </>
            )}

            {repo && (
              <>
                <span className="meta-sep">·</span>
                <RepoStatus repo={repo} />
                <span className="meta-sep">·</span>
                <span>updated {timeAgo(repo.pushedAt)}</span>
                <span className="meta-sep">·</span>
                <a href={repo.url} target="_blank" rel="noreferrer">
                  Open on GitHub ↗
                </a>
              </>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="progress" aria-hidden>
              <div style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
            </div>
          )}
        </header>
      </div>
      <TaskList
        key={project.id}
        tasks={tasks}
        projects={data.projects}
        update={update}
        notify={notify}
        defaultProjectId={project.id}
        showProject={false}
        emptyText="No open tasks in this folder."
      />
    </div>
  );
}

/* ---------------- macOS-style Vertical Dock ---------------- */

function Dock({ view, setView, projectsCount, notesCount, openCount, todayOpenCount, fileStatus, fileName }) {
  const isFoldersActive = view.type === 'folders' || view.type === 'project';

  return (
    <aside className="dock" aria-label="Navigation dock">
      {/* All Tasks */}
      <div className="dock-slot">
        <button
          type="button"
          className={`dock-item ${view.type === 'all' ? 'active' : ''}`}
          onClick={() => setView({ type: 'all' })}
          aria-label="All tasks"
        >
          <svg viewBox="0 0 20 20" width="20" height="20">
            <rect x="3" y="3" width="14" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M6.5 10.2l2.3 2.3 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {openCount > 0 && <span className="dock-badge">{openCount}</span>}
        </button>
        <span className="dock-tooltip">All tasks</span>
      </div>

      {/* Today */}
      <div className="dock-slot">
        <button
          type="button"
          className={`dock-item ${view.type === 'today' ? 'active' : ''}`}
          onClick={() => setView({ type: 'today' })}
          aria-label="Today"
        >
          <svg viewBox="0 0 20 20" width="20" height="20">
            <rect x="3" y="4" width="14" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 8h14M6.5 2.5v3M13.5 2.5v3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="10" cy="12.5" r="1.6" fill="currentColor" />
          </svg>
          {todayOpenCount > 0 && <span className="dock-badge">{todayOpenCount}</span>}
        </button>
        <span className="dock-tooltip">Today</span>
      </div>

      {/* Folders Page */}
      <div className="dock-slot">
        <button
          type="button"
          className={`dock-item ${isFoldersActive ? 'active' : ''}`}
          onClick={() => setView({ type: 'folders' })}
          aria-label="Folders"
        >
          <svg viewBox="0 0 20 20" width="20" height="20">
            <path
              d="M2.5 5.5A1.8 1.8 0 0 1 4.3 3.7h3.6l1.7 1.9h6.1a1.8 1.8 0 0 1 1.8 1.8v7.1a1.8 1.8 0 0 1-1.8 1.8H4.3a1.8 1.8 0 0 1-1.8-1.8z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          {projectsCount > 0 && <span className="dock-badge">{projectsCount}</span>}
        </button>
        <span className="dock-tooltip">Folders</span>
      </div>

      {/* Notes Page */}
      <div className="dock-slot">
        <button
          type="button"
          className={`dock-item ${view.type === 'notes' ? 'active' : ''}`}
          onClick={() => setView({ type: 'notes' })}
          aria-label="Notes"
        >
          <svg viewBox="0 0 20 20" width="20" height="20">
            <rect x="3.5" y="2.8" width="13" height="14.4" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M6.8 7h6.4M6.8 10.2h6.4M6.8 13.4h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {notesCount > 0 && <span className="dock-badge">{notesCount}</span>}
        </button>
        <span className="dock-tooltip">Notes</span>
      </div>

      {/* GitHub Repos */}
      <div className="dock-slot">
        <button
          type="button"
          className={`dock-item ${view.type === 'github' ? 'active' : ''}`}
          onClick={() => setView({ type: 'github' })}
          aria-label="GitHub repos"
        >
          <svg viewBox="0 0 20 20" width="20" height="20">
            <path
              fill="currentColor"
              d="M10 2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.48c-2.23.48-2.7-.95-2.7-.95-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 10 2z"
            />
          </svg>
        </button>
        <span className="dock-tooltip">GitHub repos</span>
      </div>

      <div className="dock-divider" />

      {/* Settings */}
      <div className="dock-slot">
        <button
          type="button"
          className={`dock-item ${view.type === 'settings' ? 'active' : ''}`}
          onClick={() => setView({ type: 'settings' })}
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <span className="dock-tooltip">
          Settings · {fileStatus === 'linked' ? `Saved to ${fileName}` : 'Browser only'}
        </span>
      </div>
    </aside>
  );
}

/* ---------------- App ---------------- */

export default function App() {
  const [modal, setModal] = useState(null);
  const openModal = useCallback((m) => setModal(m), []);
  const closeModal = useCallback(() => setModal(null), []);
  const showAlert = useCallback((title, message) => setModal({ title, message }), []);

  const store = useStore(showAlert);
  const { data, update, replaceAll, fileStatus, fileName } = store;
  const sync = useGitHubSync(data, update);
  const [view, setView] = useState({ type: 'all' });
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [noteSearch, setNoteSearch] = useState('');
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, undo) => setToast({ message, undo, id: Date.now() }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const theme = data?.settings?.theme || 'terracotta';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!data) return <div className="loading">Loading…</div>;

  const today = todayStr();
  const open = data.tasks.filter((t) => !t.done);
  const isTodayTask = (t) => t.due && t.due <= today && (!t.done || (t.doneAt && toDateStr(new Date(t.doneAt)) === today));
  const todayOpenCount = open.filter((t) => t.due && t.due <= today).length;
  const project = view.type === 'project' ? data.projects.find((p) => p.id === view.id) : null;

  // Notes sorting (pinned first, then most recently edited) & search
  const sortedNotes = [...(data.notes || [])].sort((a, b) => {
    if (Boolean(b.pinned) !== Boolean(a.pinned)) return b.pinned ? 1 : -1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
  const q = noteSearch.trim().toLowerCase();
  const filteredNotes = q
    ? sortedNotes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q),
    )
    : sortedNotes;
  const activeNote =
    sortedNotes.find((n) => n.id === selectedNoteId) || sortedNotes[0] || null;

  const createNote = () => {
    const now = Date.now();
    const note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      projectId: null,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    update((d) => ({ ...d, notes: [note, ...(d.notes || [])] }));
    setSelectedNoteId(note.id);
    setNoteSearch('');
  };

  const updateNote = (changes) => {
    if (!activeNote) return;
    update((d) => ({
      ...d,
      notes: (d.notes || []).map((n) =>
        n.id === activeNote.id ? { ...n, ...changes, updatedAt: Date.now() } : n,
      ),
    }));
  };

  const deleteNote = (note) => {
    update((d) => ({
      ...d,
      notes: (d.notes || []).filter((n) => n.id !== note.id),
    }));
    notify('Note deleted', () =>
      update((d) => ({ ...d, notes: [note, ...(d.notes || [])] })),
    );
  };

  let content;
  if (view.type === 'today') {
    content = (
      <div className="view task-page-view">
        <header className="view-header task-page-head">
          <div>
            <h1>Today</h1>
            <p className="subtle">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </header>
        <TaskList
          key="today"
          tasks={data.tasks.filter(isTodayTask)}
          projects={data.projects}
          update={update}
          notify={notify}
          defaultDue={today}
          emptyText="Nothing due today."
        />
      </div>
    );
  } else if (view.type === 'folders') {
    content = (
      <FoldersView
        data={data}
        update={update}
        onOpenProject={(id) => setView({ type: 'project', id })}
      />
    );
  } else if (view.type === 'project' && project) {
    content = (
      <ProjectView
        key={project.id}
        project={project}
        data={data}
        update={update}
        notify={notify}
        openModal={openModal}
        onBack={() => setView({ type: 'folders' })}
      />
    );
  } else if (view.type === 'notes') {
    content = (
      <NotesListPane
        notes={filteredNotes}
        projects={data.projects}
        selectedId={activeNote?.id || null}
        onSelect={setSelectedNoteId}
        onCreate={createNote}
        search={noteSearch}
        onSearch={setNoteSearch}
      />
    );
  } else if (view.type === 'github') {
    content = <GitHubView data={data} update={update} sync={sync} onOpenProject={(id) => setView({ type: 'project', id })} />;
  } else if (view.type === 'settings') {
    content = <SettingsView data={data} update={update} replaceAll={replaceAll} store={store} sync={sync} openModal={openModal} />;
  } else {
    content = (
      <div className="view task-page-view">
        <header className="view-header task-page-head">
          <div>
            <h1>All tasks</h1>
            <p className="subtle">
              {open.length} open · {data.tasks.length - open.length} done
            </p>
          </div>
        </header>
        <TaskList
          key="all"
          tasks={data.tasks}
          projects={data.projects}
          update={update}
          notify={notify}
          groupByFolder
        />
      </div>
    );
  }

  const showTaskStats = view.type === 'all' || view.type === 'today' || view.type === 'folders' || (view.type === 'project' && project);
  const showGitHubStats = view.type === 'github' && Boolean(data.settings.githubUsername);
  const showNotesEditor = view.type === 'notes';
  const isSplit = showTaskStats || showGitHubStats || showNotesEditor;
  const statsTasks = view.type === 'project' && project ? data.tasks.filter((t) => t.projectId === project.id) : data.tasks;
  const viewKey = `${view.type}-${view.id || ''}`;
  const rightKey = showNotesEditor ? 'notes-editor' : showGitHubStats ? 'github-stats' : showTaskStats ? 'task-stats' : 'none';

  return (
    <div className="app" data-theme={theme}>
      <Dock
        view={view}
        setView={setView}
        projectsCount={data.projects.length}
        notesCount={(data.notes || []).length}
        openCount={open.length}
        todayOpenCount={todayOpenCount}
        fileStatus={fileStatus}
        fileName={fileName}
      />

      <main className="main">
        <StorageBanner store={store} />
        <div className={isSplit ? 'workspace split' : 'workspace'}>
          <div key={viewKey} className="workspace-left view-animate">
            {content}
          </div>
          {showTaskStats && (
            <div key={rightKey} className="workspace-right view-animate">
              <StatsPanel
                tasks={statsTasks}
                history={view.type === 'project' ? {} : data.history}
              />
            </div>
          )}
          {showGitHubStats && (
            <div key={rightKey} className="workspace-right view-animate">
              <GitHubStatsPanel data={data} sync={sync} />
            </div>
          )}
          {showNotesEditor && (
            <div key={rightKey} className="workspace-right view-animate notes-right">
              <NoteEditorPane
                note={activeNote}
                projects={data.projects}
                onUpdate={updateNote}
                onDelete={deleteNote}
                onCreate={createNote}
              />
            </div>
          )}
        </div>
      </main>

      <Toast key={toast?.id} toast={toast} onClose={closeToast} />
      <Modal modal={modal} onClose={closeModal} />
    </div>
  );
}
