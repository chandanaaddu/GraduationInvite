
/* ===== Small helpers ===== */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const fmtTime12 = (hm) => {
  if(!hm) return "";
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(); d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
};
const pad = (n) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
const slug = (s) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g,"");

/* ===== Status logic =====
   - If status === "skipped" => skipped
   - Else based on now vs start/end
*/
function computeStatus(item, now=new Date()) {
  if ((item.status||"").toLowerCase() === "skipped") return "skipped";
  const start = new Date(`${item.date}T${item.start||"00:00"}:00`);
  const end   = new Date(`${item.date}T${item.end||"23:59"}:59`);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "completed";
}

/* Build Google Maps URLs from address */
function mapsLink(address) {
  const q = encodeURIComponent(address);
  return `https://www.google.com/maps?q=${q}`;
}
function mapsEmbed(address) {
  const q = encodeURIComponent(address);
  // keyless embed for search queries (sufficient for a preview)
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

/* ===== Rendering ===== */
let DATA = [];

function render(list) {
  const cards = $("#cards");
  cards.innerHTML = "";

  if (!list.length) {
    $("#emptyState").classList.remove("hidden");
    return;
  }
  $("#emptyState").classList.add("hidden");

  // group by date, then render
  const byDate = list.reduce((acc, it) => {
    (acc[it.date] ||= []).push(it);
    return acc;
  }, {});

  const dates = Object.keys(byDate).sort(); // ascending

  dates.forEach(date => {
    const group = byDate[date].sort((a,b) => (a.start||"").localeCompare(b.start||""));

    group.forEach(item => {
      const status = computeStatus(item);
      const card = document.createElement("article");
      card.className = "card";
      card.id = `card-${slug(item.family)}-${item.date}`;

      const mapURL = mapsLink(item.address);
      const embedURL = mapsEmbed(item.address);

      card.innerHTML = `
        <div class="top">
          <div class="tree">🎄</div>
          <div class="title">
            <h3>${item.family}</h3>
            <div class="date">${new Date(item.date).toLocaleDateString([], {weekday:"short", month:"short", day:"numeric", year:"numeric"})}</div>
          </div>
        </div>

        <div class="kv">
          <div class="row"><div class="label">Time</div><div class="val">${fmtTime12(item.start)} – ${fmtTime12(item.end)}</div></div>
          <div class="row"><div class="label">Address</div><div class="val">${item.address}</div></div>
          <div class="row"><div class="label">Verse</div><div class="val"><strong>${item.verseRef||""}</strong>${item.verseText ? ` — ${item.verseText}` : ""}</div></div>
        </div>

        <div class="pills">
          <span class="pill status-${status}">${status.toUpperCase()}</span>
        </div>

        <div class="actions">
          ${mapURL}Open in Google Maps</a>
          <button class="btn secondary" data-save="${card.id}">Save as Image</button>
        </div>

        ${embedURL}</iframe>
      `;
      cards.appendChild(card);
    });
  });

  // wire up image export
  $$("button[data-save]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-save");
      const node = document.getElementById(id);
      // temporarily hide the map iframe for snapshot clarity
      const map = node.querySelector(".map");
      map.style.visibility = "hidden";
      try {
        const canvas = await html2canvas(node, {backgroundColor: "#0b1a22", scale: 2});
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `${id}.png`;
        a.click();
      } finally {
        map.style.visibility = "visible";
      }
    });
  });
}

/* ===== Filtering / Search ===== */
function applyFilters() {
  const q = ($("#search").value || "").toLowerCase().trim();
  const d = $("#dateFilter").value || "";

  const out = DATA.filter(it => {
    const hitQ = !q || [it.family, it.address, it.verseRef, it.verseText].join(" ").toLowerCase().includes(q);
    const hitD = !d || it.date === d;
    return hitQ && hitD;
  });
  render(out);
}

/* ===== Init ===== */
async function init() {
  const res = await fetch("data.json", {cache: "no-store"});
  const data = await res.json();

  // Normalize + keep for filters
  DATA = data.map(x => ({
    ...x,
    date: x.date, // expecting YYYY-MM-DD
    start: x.start || "",
    end: x.end || "",
    family: x.family || "",
    address: x.address || "",
    verseRef: x.verseRef || "",
    verseText: x.verseText || "",
    status: (x.status||"").toLowerCase()
  }));

  // default date filter to today if there are matches
  const hasToday = DATA.some(d => d.date === todayISO());
  if (hasToday) $("#dateFilter").value = todayISO();

  $("#lastUpdated").textContent = new Date().toLocaleString();

  render(DATA);
  $("#search").addEventListener("input", applyFilters);
  $("#dateFilter").addEventListener("change", applyFilters);
  $("#clearFilters").addEventListener("click", () => {
    $("#search").value = "";
    $("#dateFilter").value = "";
    applyFilters();
  });
}

init();
