import { useCallback, useEffect, useRef, useState } from 'react';
import * as S from './storage';

/**
 * Holds all app data and keeps it saved:
 *  - always to a backup copy inside the browser
 *  - to the chosen tasks.json file on disk (when linked)
 *
 * fileStatus: 'unsupported' | 'none' | 'needs-permission' | 'linked' | 'error'
 */
export function useStore(showAlert) {
  const [data, setData] = useState(null);
  const [fileStatus, setFileStatus] = useState(S.fsSupported ? 'none' : 'unsupported');
  const [fileName, setFileName] = useState('');
  const handleRef = useRef(null);
  const writeTimer = useRef(null);

  // Load on startup: the newest of (file on disk, browser backup).
  useEffect(() => {
    (async () => {
      const backup = await S.loadBackup();
      let initial = backup;
      if (S.fsSupported) {
        const handle = await S.getHandle();
        if (handle) {
          handleRef.current = handle;
          setFileName(handle.name);
          try {
            if ((await S.permission(handle)) === 'granted') {
              initial = S.newer(await S.readFile(handle), backup);
              setFileStatus('linked');
            } else {
              setFileStatus('needs-permission');
            }
          } catch (err) {
            console.error(err);
            setFileStatus('error');
          }
        }
      }
      setData(initial);
    })();
  }, []);

  // Save whenever data changes.
  useEffect(() => {
    if (!data) return;
    S.saveBackup(data);
    if (fileStatus !== 'linked' || !handleRef.current) return;
    clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(async () => {
      try {
        await S.writeFile(handleRef.current, data);
      } catch (err) {
        console.error(err);
        const p = await S.permission(handleRef.current).catch(() => 'denied');
        setFileStatus(p === 'granted' ? 'error' : 'needs-permission');
      }
    }, 250);
  }, [data, fileStatus]);

  const update = useCallback((fn) => {
    setData((d) => ({ ...fn(d), updatedAt: Date.now() }));
  }, []);

  const replaceAll = useCallback((next) => {
    setData({ ...S.normalize(next), updatedAt: Date.now() });
  }, []);

  const link = (handle, status = 'linked') => {
    S.rememberFile(handle);
    handleRef.current = handle;
    setFileName(handle.name);
    setFileStatus(status);
  };

  const ignoreCancel = (err) => {
    if (err?.name === 'AbortError') return; // user closed the picker
    console.error(err);
    showAlert?.('File error', err?.message || 'Something went wrong with the file.');
  };

  // Create a new tasks.json and save the current tasks into it.
  const createFile = useCallback(async () => {
    try {
      const handle = await S.pickNewFile();
      await S.writeFile(handle, data);
      link(handle);
    } catch (err) {
      ignoreCancel(err);
    }
  }, [data]);

  // Open an existing tasks.json and load what's in it.
  const openFile = useCallback(async () => {
    try {
      const handle = await S.pickExistingFile();
      // Ask for write access right away (while the click still counts as a user action).
      const granted = (await S.permission(handle, true)) === 'granted';
      let fromFile;
      try {
        fromFile = await S.readFile(handle);
      } catch {
        showAlert?.('Invalid file', "That file doesn't look like a valid tasks JSON file.");
        return;
      }
      if (fromFile) setData(fromFile);
      link(handle, granted ? 'linked' : 'needs-permission');
    } catch (err) {
      ignoreCancel(err);
    }
  }, []);

  // Re-grant access to the remembered file (Edge asks again after a restart).
  const reconnect = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle) return;
    try {
      if ((await S.permission(handle, true)) !== 'granted') return;
      const fromFile = await S.readFile(handle);
      setData((current) => S.newer(fromFile, current));
      setFileStatus('linked');
    } catch (err) {
      ignoreCancel(err);
      setFileStatus('error');
    }
  }, []);

  const unlinkFile = useCallback(async () => {
    await S.forgetFile();
    handleRef.current = null;
    setFileName('');
    setFileStatus('none');
  }, []);

  return { data, update, replaceAll, fileStatus, fileName, createFile, openFile, reconnect, unlinkFile };
}
