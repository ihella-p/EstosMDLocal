window.addEventListener("DOMContentLoaded", () => {
  const out = document.getElementById("out");
  const qEl = document.getElementById("q");
  const go  = document.getElementById("go");
  const status = document.getElementById("status");

  function setStatus(msg){ if(status) status.textContent = msg; }

  function getANIFromUrl(){
    const p = new URLSearchParams(window.location.search);
    return (p.get("ANI") || "").trim();
  }

  function normalizeAni(raw){
  let s = (raw || "").trim();

  if (s.startsWith(" ")) {
    s = "+" + s.trim();
  }
  s = s.replace(/[^\d+]/g, "");

  if (s.startsWith("00")) {
    s = "+" + s.slice(2);
  }

  if (!s.startsWith("+") && s.length >= 10) {
    s = "+" + s;
  }

  return s;
}


  function esc(s){
    return (s ?? "").toString().replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function looksLikeNumber(q){
    const t = q.replace(/\s+/g,"");
    return /^[+0-9][0-9()+\-]{5,}$/.test(t) && /[0-9]{6,}/.test(t);
  }

  function chip(label, value, href, primary=false){
    if(!value) return "";
    const cls = primary ? "chip primary" : "chip";
    return `<a class="${cls}" href="${esc(href)}"><b>${esc(label)}</b> ${esc(value)}</a>`;
  }

  function render(list){
    if(!Array.isArray(list) || list.length === 0){
      out.innerHTML = `<div class="empty">No results.</div>`;
      return;
    }

    out.innerHTML = `<div class="grid">` + list.map(c => {
      const name = c.displayName || [c.givenName, c.sn].filter(Boolean).join(" ") || "(no name)";
      const sub  = [c.company, c.department, c.title].filter(Boolean).join(" · ");

      const tel  = c.telephoneNumber || "";
      const alt  = c.otherTelephone || "";
      const mob  = c.mobile || "";
      const mail = c.mail || "";
      const url  = c.url || "";

      const addr = [c.streetAddress, [c.postalCode, c.l].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      const src  = c.databaseName || "";

      return `
        <div class="card">
          <div class="name">${esc(name)}</div>
          <div class="sub">${esc(sub)}</div>

          <div class="chips">
            ${tel  ? chip("Call", tel, "tel:" + tel, true) : ""}
            ${alt  ? chip("Alt", alt, "tel:" + alt, false) : ""}
            ${mob  ? chip("Mobile", mob, "tel:" + mob, false) : ""}
            ${mail ? `<a class="chip" href="mailto:${esc(mail)}"><b>Email</b> ${esc(mail)}</a>` : ""}
            ${url  ? `<a class="chip" href="${esc(url)}" target="_blank" rel="noreferrer"><b>Website</b></a>` : ""}
          </div>

          ${src  ? `<div class="kv"><b>Source</b> ${esc(src)}</div>` : ""}
          ${addr ? `<div class="kv"><b>Address</b> ${esc(addr)}</div>` : ""}
        </div>
      `;
    }).join("") + `</div>`;
  }

  async function doSearch(){
    const q = (qEl.value || "").trim();
    if(!q){ out.innerHTML = ""; setStatus("Type something, then Enter."); return; }

    const param = looksLikeNumber(q) ? "searchNumber" : "searchContact";
    const url = `/search.json?${param}=${encodeURIComponent(q)}`;

    setStatus(`Query: ${url}`);

    let res;
    try{
      res = await fetch(url, { headers: { "Accept":"application/json" }, cache: "no-store" });
    }catch(e){
      setStatus("Network error: fetch failed (check console).");
      out.innerHTML = `<div class="empty">Fetch failed. Try opening ${esc(url)} directly.</div>`;
      return;
    }

    if(!res.ok){
      setStatus(`HTTP error ${res.status}`);
      out.innerHTML = `<div class="empty">Server returned ${res.status} for ${esc(url)}</div>`;
      return;
    }

    let data;
    try{
      data = await res.json();
    }catch(e){
      setStatus("Not JSON response.");
      const txt = await res.text().catch(()=>"(no body)");
      out.innerHTML = `<div class="empty">Not JSON. First chars: ${esc(txt.slice(0,200))}</div>`;
      return;
    }

    setStatus(`OK. ${Array.isArray(data) ? data.length : 0} result(s).`);
    render(data);
  }

  // Manual search
  go.addEventListener("click", doSearch);
  qEl.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){ e.preventDefault(); doSearch(); }
  });

  // Screen-pop auto search via ANI (runs once, safely)
  setStatus("Ready.");
  const ani = normalizeAni(getANIFromUrl());
  if (ani) {
    qEl.value = ani;
    doSearch();
  }
});
