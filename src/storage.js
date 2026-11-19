import { get, set, del } from 'idb-keyval';

// Everything the app knows lives in one object, saved as one JSON file.
export const emptyData = () => ({
  version: 1,
  updatedAt: 0,
  tasks: [],
  projects: [],
  notes: [],
  history: {}, // { 'YYYY-MM-DD': count } of cleared completed tasks so graphs keep their history
  settings: { githubUsername: '', theme: 'terracotta' },
  github: { username: '', repos: [], calendar: null, fetchedAt: null },
});

export function getToken() {
  try {
    return localStorage.getItem('gh_pat') || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem('gh_pat', token);
    else localStorage.removeItem('gh_pat');
  } catch {
    // ignore storage errors
  }
}

export const fsSupported = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

export function normalize(d) {
  const e = emptyData();
  if (!d || typeof d !== 'object') return e;
  const cleanSettings = { ...e.settings, ...d.settings };
  delete cleanSettings.githubToken; // never store token in tasks.json
  return {
    ...e,
    ...d,
    tasks: Array.isArray(d.tasks) ? d.tasks : [],
    projects: Array.isArray(d.projects) ? d.projects : [],
    notes: Array.isArray(d.notes) ? d.notes : [],
    history: d.history && typeof d.history === 'object' ? d.history : {},
    settings: cleanSettings,
    github: { ...e.github, ...d.github },
  };
}

// Pick whichever copy was changed most recently.
export function newer(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
}

/* ---------- Browser backup copy (IndexedDB) ---------- */

export async function loadBackup() {
  return normalize(await get('data'));
}

export function saveBackup(data) {
  return set('data', data);
}

/* ---------- The real file on disk (File System Access API) ---------- */

const pickerTypes = [{ description: 'Tasks file', accept: { 'application/json': ['.json'] } }];

export async function getHandle() {
  return (await get('fileHandle')) ?? null;
}

export function rememberFile(handle) {
  return set('fileHandle', handle);
}

export function forgetFile() {
  return del('fileHandle');
}

export async function permission(handle, ask = false) {
  const opts = { mode: 'readwrite' };
  let state = await handle.queryPermission(opts);
  if (state !== 'granted' && ask) state = await handle.requestPermission(opts);
  return state;
}

export async function readFile(handle) {
  const file = await handle.getFile();
  const text = await file.text();
  if (!text.trim()) return null; // brand new empty file
  return normalize(JSON.parse(text));
}

export async function writeFile(handle, data) {
  const w = await handle.createWritable();
  await w.write(JSON.stringify(data, null, 2));
  await w.close();
}

export function pickNewFile() {
  return window.showSaveFilePicker({ suggestedName: 'tasks.json', types: pickerTypes });
}

export async function pickExistingFile() {
  const [handle] = await window.showOpenFilePicker({ types: pickerTypes, multiple: false });
  return handle;
}
