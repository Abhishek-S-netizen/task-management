import { useState } from 'react';
import { dueInfo, sortKey, toDateStr } from './dates';
import { DatePicker, TimePicker, Select } from './Pickers';

const uid = () => crypto.randomUUID();

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

/* ---------------- Add task ---------------- */

function AddTask({ projects, defaultProjectId, defaultDue, onAdd }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(defaultDue || '');
  const [time, setTime] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const lockedProject = Boolean(defaultProjectId);

  const folderOptions = [
    { value: '', label: 'No folder' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const handleDueChange = (nextDue) => {
    setDue(nextDue);
    if (!nextDue) setTime('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      id: uid(),
      title: title.trim(),
      notes: '',
      due: due || '',
      time: due ? time : '',
      projectId: (lockedProject ? defaultProjectId : projectId) || null,
      done: false,
      doneAt: null,
      createdAt: Date.now(),
    });
    setTitle('');
    setTime('');
    setDue(defaultDue || '');
  };

  return (
    <form className="add-task" onSubmit={submit}>
      <input
        className="add-title"
        placeholder="Add a task…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Task title"
      />
      <div className="add-row">
        <DatePicker value={due} onChange={handleDueChange} />
        <TimePicker value={time} onChange={setTime} disabled={!due} />
        {!lockedProject && (
          <Select
            value={projectId}
            onChange={setProjectId}
            options={folderOptions}
            placeholder="No folder"
            icon={<FolderIcon />}
            ariaLabel="Folder"
          />
        )}
        <button className="btn primary" type="submit" disabled={!title.trim()}>
          Add
        </button>
      </div>
    </form>
  );
}

/* ---------------- Edit task ---------------- */

function EditTask({ task, projects, onSave, onCancel, onDelete }) {
  const [draft, setDraft] = useState(task);
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  const folderOptions = [
    { value: '', label: 'No folder' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const save = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    onSave({
      ...draft,
      title: draft.title.trim(),
      time: draft.due ? draft.time : '',
      projectId: draft.projectId || null,
    });
  };

  return (
    <form className="edit-task" onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <input className="edit-title" value={draft.title} onChange={set('title')} autoFocus aria-label="Title" />
      <textarea placeholder="Notes" rows={3} value={draft.notes} onChange={set('notes')} aria-label="Notes" />
      <div className="add-row">
        <DatePicker
          value={draft.due}
          onChange={(due) => setDraft({ ...draft, due, time: due ? draft.time : '' })}
        />
        <TimePicker
          value={draft.time}
          onChange={(time) => setDraft({ ...draft, time })}
          disabled={!draft.due}
        />
        <Select
          value={draft.projectId || ''}
          onChange={(projectId) => setDraft({ ...draft, projectId })}
          options={folderOptions}
          placeholder="No folder"
          icon={<FolderIcon />}
          ariaLabel="Folder"
        />
      </div>
      <div className="edit-actions">
        <button type="button" className="btn danger-text" onClick={onDelete}>
          Delete
        </button>
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary">
          Save
        </button>
      </div>
    </form>
  );
}

/* ---------------- One task ---------------- */

function TaskItem({ task, project, showProject, onToggle, onEdit, onDelete }) {
  const due = dueInfo(task);
  return (
    <li className={`task ${task.done ? 'done' : ''}`}>
      <button
        className="check"
        onClick={onToggle}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
        title={task.done ? 'Mark as not done' : 'Mark as done'}
      >
        {task.done && (
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <div className="task-body" onClick={onEdit}>
        <div className="task-title">{task.title}</div>
        {(due || (showProject && project) || task.notes) && (
          <div className="task-meta">
            {due && <span className={due.overdue ? 'overdue' : ''}>{due.label}</span>}
            {showProject && project && <span className="folder-pill">{project.name}</span>}
            {task.notes && <span title={task.notes}>Notes</span>}
          </div>
        )}
      </div>
      <div className="task-actions">
        <button className="icon-btn" onClick={onEdit} title="Edit" aria-label="Edit">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="icon-btn" onClick={onDelete} title="Delete" aria-label="Delete">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </li>
  );
}

/* ---------------- The list ---------------- */

export default function TaskList({ tasks, projects, update, notify, defaultProjectId, defaultDue, showProject = true, emptyText }) {
  const [editingId, setEditingId] = useState(null);
  const [showDone, setShowDone] = useState(false);

  const open = tasks.filter((t) => !t.done).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));

  const add = (task) => update((d) => ({ ...d, tasks: [...d.tasks, task] }));
  const save = (task) => {
    update((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === task.id ? task : t)) }));
    setEditingId(null);
  };
  const toggle = (task) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done, doneAt: t.done ? null : Date.now() } : t)),
    }));
  const remove = (task) => {
    update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== task.id) }));
    setEditingId(null);
    notify('Task deleted', () => update((d) => ({ ...d, tasks: [...d.tasks, task] })));
  };
  const clearDone = () => {
    const ids = new Set(done.map((t) => t.id));
    update((d) => {
      const nextHistory = { ...(d.history || {}) };
      for (const t of done) {
        if (t.doneAt) {
          const ds = toDateStr(new Date(t.doneAt));
          nextHistory[ds] = (nextHistory[ds] || 0) + 1;
        }
      }
      return {
        ...d,
        history: nextHistory,
        tasks: d.tasks.filter((t) => !ids.has(t.id)),
      };
    });
    notify(`Cleared ${done.length} completed`, () =>
      update((d) => {
        const revertedHistory = { ...(d.history || {}) };
        for (const t of done) {
          if (t.doneAt) {
            const ds = toDateStr(new Date(t.doneAt));
            revertedHistory[ds] = Math.max(0, (revertedHistory[ds] || 0) - 1);
            if (!revertedHistory[ds]) delete revertedHistory[ds];
          }
        }
        return { ...d, history: revertedHistory, tasks: [...d.tasks, ...done] };
      }),
    );
  };

  const renderItem = (task) =>
    editingId === task.id ? (
      <li key={task.id} className="task editing">
        <EditTask
          task={task}
          projects={projects}
          onSave={save}
          onCancel={() => setEditingId(null)}
          onDelete={() => remove(task)}
        />
      </li>
    ) : (
      <TaskItem
        key={task.id}
        task={task}
        project={projectById[task.projectId]}
        showProject={showProject}
        onToggle={() => toggle(task)}
        onEdit={() => setEditingId(task.id)}
        onDelete={() => remove(task)}
      />
    );

  return (
    <div className="task-list">
      <AddTask projects={projects} defaultProjectId={defaultProjectId} defaultDue={defaultDue} onAdd={add} />

      {open.length === 0 ? <p className="empty">{emptyText || 'Nothing to do. Nice.'}</p> : <ul>{open.map(renderItem)}</ul>}

      {done.length > 0 && (
        <div className="done-section">
          <div className="done-header">
            <button className="link-btn" onClick={() => setShowDone(!showDone)}>
              {showDone ? '▾' : '▸'} Completed ({done.length})
            </button>
            {showDone && (
              <button className="link-btn muted" onClick={clearDone}>
                Clear completed
              </button>
            )}
          </div>
          {showDone && <ul>{done.map(renderItem)}</ul>}
        </div>
      )}
    </div>
  );
}
