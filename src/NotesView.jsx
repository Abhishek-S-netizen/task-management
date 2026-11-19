import { useState } from 'react';
import { timeAgo } from './dates';
import { Select } from './Pickers';

const FolderIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13">
    <path
      d="M1.8 4.2A1.4 1.4 0 0 1 3.2 2.8h3.1l1.4 1.5h5.1a1.4 1.4 0 0 1 1.4 1.4v6.1a1.4 1.4 0 0 1-1.4 1.4H3.2a1.4 1.4 0 0 1-1.4-1.4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export function NotesListPane({
  notes,
  projects,
  selectedId,
  onSelect,
  onCreate,
  search,
  onSearch,
}) {
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));

  return (
    <div className="view notes-list-view">
      <div className="notes-top">
        <header className="view-header">
          <div>
            <h1>Notes</h1>
            <p className="subtle">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
          <button type="button" className="btn primary" onClick={onCreate}>
            + New note
          </button>
        </header>

        {notes.length > 0 && (
          <div className="notes-search-row">
            <input
              className="notes-search"
              placeholder="Search notes…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              aria-label="Search notes"
            />
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="empty">No notes yet. Click "+ New note" to jot something down.</p>
      ) : (
        <ul className="notes-items">
          {notes.map((n) => {
            const active = n.id === selectedId;
            const folder = n.projectId ? projectById[n.projectId] : null;
            const firstLine = (n.content || '')
              .split('\n')
              .map((l) => l.trim())
              .find(Boolean);

            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`note-card ${active ? 'selected' : ''}`}
                  onClick={() => onSelect(n.id)}
                >
                  <div className="note-card-head">
                    <span className="note-card-title">
                      {n.title?.trim() || 'Untitled note'}
                    </span>
                    {n.pinned && (
                      <span className="note-pin-badge" title="Pinned">
                        Pinned
                      </span>
                    )}
                  </div>

                  <div className="note-card-preview">
                    {firstLine || 'No content yet…'}
                  </div>

                  <div className="task-meta">
                    {folder && <span className="folder-pill">{folder.name}</span>}
                    <span>edited {timeAgo(n.updatedAt)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function NoteEditorPane({ note, projects, onUpdate, onDelete, onCreate }) {
  if (!note) {
    return (
      <aside className="note-editor-card empty-editor" aria-label="Note editor">
        <p className="subtle">Select a note on the left or create a new one.</p>
        <button type="button" className="btn primary" onClick={onCreate}>
          + New note
        </button>
      </aside>
    );
  }

  const folderOptions = [
    { value: '', label: 'No folder' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <aside className="note-editor-card" aria-label="Note editor">
      <div className="note-editor-top">
        <input
          className="note-title-input"
          placeholder="Note title…"
          value={note.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          aria-label="Note title"
        />

        <div className="note-toolbar">
          <Select
            value={note.projectId || ''}
            onChange={(projectId) => onUpdate({ projectId: projectId || null })}
            options={folderOptions}
            placeholder="No folder"
            icon={<FolderIcon />}
            ariaLabel="Folder"
          />

          <button
            type="button"
            className={`btn small-btn ${note.pinned ? 'primary' : ''}`}
            onClick={() => onUpdate({ pinned: !note.pinned })}
          >
            {note.pinned ? 'Pinned' : 'Pin'}
          </button>

          <span className="note-edited-at">Edited {timeAgo(note.updatedAt)}</span>

          <button
            type="button"
            className="btn small-btn danger-text"
            onClick={() => onDelete(note)}
          >
            Delete
          </button>
        </div>
      </div>

      <textarea
        className="note-body-input"
        placeholder="Write your note here…"
        value={note.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        aria-label="Note content"
      />
    </aside>
  );
}
