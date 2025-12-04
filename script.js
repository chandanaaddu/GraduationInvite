
// --- Utility: robust CSV parser (no external libs) ---
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') pushField();
      else if (c === '\n' || c === '\r') { 
        // handle CRLF/CR/LF
        if (c === '\r' && text[i + 1] === '\n') i++;
        pushField(); pushRow();
        // skip multiple line breaks
        while (text[i + 1] === '\n' || text[i + 1] === '\r') i++;
      } else field += c;
    }
    i++;
  }
  // last field/row
  if (field.length || row.length) { pushField(); pushRow(); }
  // drop empty trailing rows
  return rows.filter(r => r.some(v => String(v).trim() !== ''));
}

// --- Column mapping by fuzzy header names ---
const HEADER_MAP = {
  sno:      [/^s\.?\s*no/i, /^sno$/i, /^#$/],
  name:     [/^family\s*name/i, /^name$/i],
  address:  [/^address/i],
  time:     [/^time\s*slot/i, /^time$/i],
  verse:    [/^bible\s*verse/i, /^verse$/i],
  map:      [/^(g[-\s]*map|map)/i],
  date:     [/^date/i, /^\d{1,2}\/\d{1,2}\/\d{2,4}$/]
};

function normalizeHeaderIndex(headers) {
  const idx = {};
  const take = (key, patterns) => {
    for (const p of patterns) {
      const j = headers.findIndex(h => p.test(String(h).trim()));
      if (j !== -1) return j;
    }
    return -1;
  };
  idx.sno = take('sno', HEADER_MAP.sno);
  idx.name = take('name', HEADER_MAP.name);
  idx.address = take('address', HEADER_MAP.address);
  idx.time = take('time', HEADER_MAP.time);
  idx.verse = take('verse', HEADER_MAP.verse);
  idx.map = take('map', HEADER_MAP.map);
  idx.date = take('date', HEADER_MAP.date);
  return idx;
}

function coerceDate(s) {
  if (!s) return '';
  const t = String(s).trim();
  // Accept formats like 12/5/25 or 12/05/2025
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return t;
  let [ , mm, dd, yy ] = m;
  if (yy.length === 2) yy = '20' + yy;
  return `${mm.padStart(2,'0')}/${dd.padStart(2,'0')}/${yy}`;
}

// --- Local storage helpers ---
function getStatus(sno) {
  return localStorage.getItem("status-" + sno) || "upcoming";
}
function setStatus(sno, status) {
  localStorage.setItem("status-" + sno, status);
  render(globalState.data);
}
function clearAllStatuses() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('status-'))
    .forEach(k => localStorage.removeItem(k));
}

// --- Global State ---
const globalState = {
  data: [] // {sno, name, address, time, verse, map, date}
};

// --- Rendering grouped by date ---
function render(data) {
  const root = document.getElementById("schedule");
  root.innerHTML = "";

  // group by date (keep input order within each date)
  const groups = new Map();
  for (const item of data) {
    const d = item.date || 'Undated';
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d).push(item);
  }

  let totals = { upcoming: 0, completed: 0, skipped: 0 };

  for (const [date, items] of groups) {
    const section = document.createElement('section');
    section.className = 'date-section';

    const header = document.createElement('div');
    header.className = 'date-header';
    header.textContent = date;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'cards';

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";

      const status = getStatus(item.sno);
      totals[status] = (totals[status] || 0) + 1;

      card.style.borderLeftColor = 
        status === 'completed' ? '#198754' :
        status === 'skipped'   ? '#dc3545' : '#6c757d';

      card.innerHTML = `
        <h3>${item.sno}. ${item.name}</h3>
        <p><strong>Address:</strong> ${item.address}</p>
        <p><strong>Time:</strong> ${item.time || ''}</p>
        <p><strong>Bible Verse:</strong> ${item.verse || ''}</p>
        ${item.map ? `${item.map}📍 Open in Google Maps</a>` : ''}
        <div class="status ${status}">${status.toUpperCase()}</div>
        <div class="actions">
          <button onclick="setStatus(${item.sno}, 'completed')">Mark Completed</button>
          <button onclick="setStatus(${item.sno}, 'upcoming')">Mark Upcoming</button>
          <button onclick="setStatus(${item.sno}, 'skipped')">Skip</button>
        </div>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    root.appendChild(section);
  }

  // overall totals footer (optional)
  const footer = document.createElement('div');
  footer.className = 'footer-total';
  footer.textContent =
    `Totals — Completed: ${totals.completed || 0} • Upcoming: ${totals.upcoming || 0} • Skipped: ${totals.skipped || 0}`;
  root.appendChild(footer);
}

// --- Convert parsed CSV rows -> data array ---
function rowsToData(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h || '').trim());
  const idx = normalizeHeaderIndex(headers);

  const required = ['sno','name','address'];
  for (const r of required) {
    if (idx[r] === -1) {
      throw new Error(`Missing required column: ${r.toUpperCase()}`);
    }
  }

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const sno = Number(String(r[idx.sno] || '').replace(/[^\d]/g, ''));
    if (!sno) continue; // skip empties/headers
    data.push({
      sno,
      name: String(r[idx.name] || '').trim(),
      address: String(r[idx.address] || '').trim(),
      time: idx.time !== -1 ? String(r[idx.time] || '').trim() : '',
      verse: idx.verse !== -1 ? String(r[idx.verse] || '').trim() : '',
      map: idx.map !== -1 ? String(r[idx.map] || '').trim() : '',
      date: coerceDate(idx.date !== -1 ? r[idx.date] : '')
    });
  }
  // sort by date then S.No (keeps natural order within date)
  const dateVal = d => d ? new Date(d).valueOf() : Infinity;
  data.sort((a, b) => (dateVal(a.date) - dateVal(b.date)) || (a.sno - b.sno));
  return data;
}

// --- Wire up toolbar ---
document.addEventListener('DOMContentLoaded', () => {
  const parseBtn = document.getElementById('parseCsvBtn');
  const clearBtn = document.getElementById('clearStatusesBtn');
  const dlBtn = document.getElementById('downloadJsonBtn');

  parseBtn.addEventListener('click', () => {
    try {
      const csv = document.getElementById('csvInput').value.trim();
      if (!csv) { alert('Please paste CSV from your sheet first.'); return; }
      const rows = parseCSV(csv);
      const data = rowsToData(rows);
      globalState.data = data;
      render(globalState.data);
      // convenience: copy the JSON to clipboard
      const json = JSON.stringify(data, null, 2);
      navigator.clipboard?.writeText(json).catch(()=>{});
    } catch (e) {
      console.error(e);
      alert('Could not parse. Please check columns and try again.\n' + e.message);
    }
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all saved statuses?')) {
      clearAllStatuses();
      render(globalState.data);
    }
  });

  dlBtn.addEventListener('click', () => {
    const json = JSON.stringify(globalState.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'carols-2025-families.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // If you already had hard-coded data, you can seed here, then render():
  // globalState.data = [...existingData];
  // render(globalState.data);
});
