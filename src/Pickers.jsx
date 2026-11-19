import { useEffect, useRef, useState } from 'react';
import { toDateStr, todayStr } from './dates';

const pad = (n) => String(n).padStart(2, '0');

function useOutsideClose(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, onClose]);
}

/* ---------------- Custom Dropdown (Select) ---------------- */

export function Select({ value, onChange, options, placeholder = 'Select…', icon, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));

  const current = options.find((o) => o.value === (value ?? ''));

  return (
    <div className="picker" ref={ref}>
      <button
        type="button"
        className={`picker-trigger ${current && current.value !== '' ? 'has-value' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        {icon && <span className="picker-icon">{icon}</span>}
        <span className="picker-label">{current ? current.label : placeholder}</span>
        <svg className="picker-caret" viewBox="0 0 16 16" width="12" height="12">
          <path d="M4.5 6.5L8 10l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="popover menu-popover" role="listbox">
          {options.map((opt) => {
            const selected = opt.value === (value ?? '');
            return (
              <button
                type="button"
                key={opt.value}
                role="option"
                aria-selected={selected}
                className={`menu-item ${selected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="menu-item-label">{opt.label}</span>
                {selected && (
                  <svg viewBox="0 0 16 16" width="13" height="13" className="menu-check">
                    <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Custom Date Picker ---------------- */

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseYMD(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatTriggerDate(str) {
  if (!str) return 'Set date';
  const today = todayStr();
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  if (str === today) return 'Today';
  if (str === toDateStr(tom)) return 'Tomorrow';
  const d = parseYMD(str);
  if (!d) return str;
  const opts = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}

export function DatePicker({ value, onChange, ariaLabel = 'Due date' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));

  const selectedDate = parseYMD(value);
  const [cursor, setCursor] = useState(() => selectedDate || new Date());

  useEffect(() => {
    if (open) setCursor(parseYMD(value) || new Date());
  }, [open, value]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    cells.push({ dateStr: toDateStr(d), day: d.getDate(), outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({ dateStr: toDateStr(dt), day: d, outside: false });
  }
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (firstDow + daysInMonth) + 1;
    const dt = new Date(year, month + 1, nextDay);
    cells.push({ dateStr: toDateStr(dt), day: dt.getDate(), outside: true });
  }

  const today = todayStr();
  const pick = (str) => {
    onChange(str);
    setOpen(false);
  };

  const quickTomorrow = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    pick(toDateStr(t));
  };

  const quickNextWeek = () => {
    const t = new Date();
    t.setDate(t.getDate() + 7);
    pick(toDateStr(t));
  };

  return (
    <div className="picker" ref={ref}>
      <button
        type="button"
        className={`picker-trigger ${value ? 'has-value' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <svg className="picker-icon" viewBox="0 0 16 16" width="13" height="13">
          <rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 6.5h12M5 1.8v2.4M11 1.8v2.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="picker-label">{formatTriggerDate(value)}</span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            className="picker-clear"
            title="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            ✕
          </span>
        )}
      </button>

      {open && (
        <div className="popover cal-popover">
          <div className="cal-quick">
            <button type="button" className="chip" onClick={() => pick(today)}>
              Today
            </button>
            <button type="button" className="chip" onClick={quickTomorrow}>
              Tomorrow
            </button>
            <button type="button" className="chip" onClick={quickNextWeek}>
              +1 week
            </button>
            {value && (
              <button type="button" className="chip muted" onClick={() => pick('')}>
                Clear
              </button>
            )}
          </div>

          <div className="cal-header">
            <span className="cal-title">
              {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <div className="cal-nav">
              <button
                type="button"
                className="icon-btn"
                aria-label="Previous month"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
              >
                ‹
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Next month"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
              >
                ›
              </button>
            </div>
          </div>

          <div className="cal-grid">
            {DAYS.map((d) => (
              <div key={d} className="cal-dow">
                {d}
              </div>
            ))}
            {cells.map((c) => {
              const isSelected = c.dateStr === value;
              const isToday = c.dateStr === today;
              return (
                <button
                  type="button"
                  key={c.dateStr}
                  className={`cal-day ${c.outside ? 'outside' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => pick(c.dateStr)}
                >
                  {c.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Custom Time Picker ---------------- */

function parseTime(str) {
  if (!str) return { hour12: 9, minute: 0, period: 'AM' };
  const [hh, mm] = str.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return { hour12, minute: Number.isFinite(mm) ? mm : 0, period };
}

function to24h(hour12, minute, period) {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

function formatTriggerTime(str) {
  if (!str) return 'Set time';
  const { hour12, minute, period } = parseTime(str);
  return `${hour12}:${pad(minute)} ${period}`;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function TimePicker({ value, onChange, disabled, ariaLabel = 'Due time' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));

  const { hour12, minute, period } = parseTime(value);

  const setPart = (next) => {
    const h = next.hour12 ?? hour12;
    const m = next.minute ?? minute;
    const p = next.period ?? period;
    onChange(to24h(h, m, p));
  };

  return (
    <div className="picker" ref={ref}>
      <button
        type="button"
        className={`picker-trigger ${value ? 'has-value' : ''}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        title={disabled ? 'Pick a date first' : ''}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <svg className="picker-icon" viewBox="0 0 16 16" width="13" height="13">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 4.8V8l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="picker-label">{formatTriggerTime(value)}</span>
        {value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            className="picker-clear"
            title="Clear time"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            ✕
          </span>
        )}
      </button>

      {open && !disabled && (
        <div className="popover time-popover">
          <div className="time-presets">
            {[
              ['9:00 AM', '09:00'],
              ['12:00 PM', '12:00'],
              ['3:00 PM', '15:00'],
              ['6:00 PM', '18:00'],
              ['9:00 PM', '21:00'],
            ].map(([label, val]) => (
              <button
                type="button"
                key={val}
                className={`chip ${value === val ? 'active' : ''}`}
                onClick={() => {
                  onChange(val);
                  setOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="time-columns">
            <div className="time-col">
              <div className="time-col-head">Hr</div>
              <div className="time-col-scroll">
                {HOURS.map((h) => (
                  <button
                    type="button"
                    key={h}
                    className={`time-cell ${value && hour12 === h ? 'selected' : ''}`}
                    onClick={() => setPart({ hour12: h })}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="time-col">
              <div className="time-col-head">Min</div>
              <div className="time-col-scroll">
                {MINUTES.map((m) => (
                  <button
                    type="button"
                    key={m}
                    className={`time-cell ${value && minute === m ? 'selected' : ''}`}
                    onClick={() => setPart({ minute: m })}
                  >
                    {pad(m)}
                  </button>
                ))}
              </div>
            </div>

            <div className="time-col period-col">
              <div className="time-col-head">AM/PM</div>
              <div className="time-col-scroll">
                {['AM', 'PM'].map((p) => (
                  <button
                    type="button"
                    key={p}
                    className={`time-cell ${value && period === p ? 'selected' : ''}`}
                    onClick={() => setPart({ period: p })}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {value && (
            <div className="time-footer">
              <button
                type="button"
                className="link-btn muted"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                Clear time
              </button>
              <button type="button" className="btn primary small-btn" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
