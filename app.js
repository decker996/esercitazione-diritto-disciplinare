"use strict";
// Esercitazione sulla banca dati (banca_dati.json, generato da quiz.py esporta).
const REPO = "decker996/esercitazione-diritto-disciplinare";
const CHIAVE = "dd-progressi-v1";
const TIPI = {
  nozione: "Nozione", normativo: "Normativo", procedura: "Procedura", termini: "Termini", competenza: "Competenza",
  caso_pratico: "Caso pratico", giurisprudenza: "Giurisprudenza", confronto: "Confronto",
};
const MODI = {
  studio: "Percorso guidato: i quesiti degli argomenti scelti, nell'ordine della Sinossi e dal più facile al più difficile. La spiegazione compare subito; se non sai rispondere, «Mostra la soluzione».",
  allenamento: "Quesiti in ordine casuale sugli argomenti scelti, con correzione e spiegazione dopo ogni risposta.",
  simulazione: "Come all'esame: quesiti estratti a caso, nessuna correzione fino alla fine. Puoi tornare indietro e cambiare risposta.",
  ripasso: "I quesiti che hai sbagliato l'ultima volta (o di cui hai chiesto la soluzione). Escono dalla lista quando li indovini.",
};
const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, ...figli) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k === "class" ? (e.className = v) : e.setAttribute(k, v);
  for (const f of figli) if (f != null) e.append(f);
  return e;
};
const mescola = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let banca = { quesiti: [], argomenti: [] }, ordineArg = {}, etichettaArg = {};
let modo = "studio", prova = null, intervallo = null;

// --- progressi nel browser -------------------------------------------------
let progressi = {};
try { progressi = JSON.parse(localStorage.getItem(CHIAVE)) || {}; } catch { progressi = {}; }
function salvaProgressi() { try { localStorage.setItem(CHIAVE, JSON.stringify(progressi)); } catch { /* browser senza memoria */ } }
function registra(id, giusta) {
  const p = progressi[id] || { t: 0, g: 0 };
  p.t++; if (giusta) p.g++; p.u = giusta; p.d = Date.now();
  progressi[id] = p; salvaProgressi();
}

// --- impostazioni --------------------------------------------------------------
function filtrati() {
  const scelti = new Set([...document.querySelectorAll("#argomenti input:checked")].map(c => c.value));
  const lez = $("lezione").value, tipo = $("tipo").value, diff = $("difficolta").value;
  return banca.quesiti.filter(q =>
    scelti.has(q.argomento) && (!lez || String(q.lezione) === lez) && (!tipo || q.tipo === tipo) &&
    (!diff || String(q.difficolta) === diff) && (!$("solo-test").checked || q.test_vernice) &&
    (!$("solo-aula").checked || q.domanda_aula) && (!$("mai-visti").checked || !progressi[q.id]) &&
    (modo !== "ripasso" || (progressi[q.id] && progressi[q.id].u === false)));
}
function aggiornaConteggio() {
  const n = filtrati().length;
  const quanti = modo === "simulazione" ? Math.min(n, +$("n-quesiti").value || 30) : n;
  $("conteggio").textContent = n ? `${quanti} ${quanti === 1 ? "quesito" : "quesiti"}${modo === "simulazione" && n > quanti ? ` estratti tra ${n}` : ""}` : "Nessun quesito con questi filtri.";
  $("inizia").disabled = !n;
  const errori = banca.quesiti.filter(q => progressi[q.id] && progressi[q.id].u === false).length;
  $("n-errori").textContent = errori ? `${errori} da rivedere` : "nessun errore da rivedere";
  const fatti = banca.quesiti.filter(q => progressi[q.id]);
  const giusti = fatti.filter(q => progressi[q.id].u).length;
  $("miei-progressi").innerHTML = `<span><b>${fatti.length} / ${banca.quesiti.length}</b>quesiti affrontati</span>` +
    `<span><b>${fatti.length ? Math.round(100 * giusti / fatti.length) : 0}%</b>esatti all'ultimo tentativo</span>` +
    `<span><b>${errori}</b>da rivedere</span>`;
}
function scegliModo(m) {
  modo = MODI[m] ? m : "studio";
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-pressed", t.dataset.modo === modo));
  $("descrizione-modo").textContent = MODI[modo];
  $("opzioni-simulazione").classList.toggle("nascosto", modo !== "simulazione");
  history.replaceState(null, "", "#" + modo);
  aggiornaConteggio();
}
function costruisciImpostazioni() {
  const conta = {};
  banca.quesiti.forEach(q => { conta[q.argomento] = (conta[q.argomento] || 0) + 1; });
  const box = $("argomenti");
  let parte = null;
  banca.argomenti.forEach((a, i) => {
    ordineArg[a.slug] = i; etichettaArg[a.slug] = a.titolo;
    if (a.parte !== parte) { parte = a.parte; box.append(el("div", { class: "parte" }, parte)); }
    const c = el("input", { type: "checkbox", value: a.slug }); c.checked = true;
    box.append(el("label", { title: a.descrizione }, c, el("span", {}, a.titolo), el("span", { class: "n" }, String(conta[a.slug] || 0))));
  });
  [...new Set(banca.quesiti.map(q => q.lezione).filter(Boolean))].sort((a, b) => a - b).forEach(n => {
    const q = banca.quesiti.find(x => x.lezione === n);
    const data = q.data_lezione ? " – " + q.data_lezione.split("-").reverse().join(".") : "";
    $("lezione").append(el("option", { value: n }, `Lezione ${n}${data}`));
  });
  Object.entries(TIPI).forEach(([k, v]) => { if (banca.quesiti.some(q => q.tipo === k)) $("tipo").append(el("option", { value: k }, v)); });
  $("solo-test").closest("label").classList.toggle("nascosto", !banca.quesiti.some(q => q.test_vernice));
  $("solo-aula").closest("label").classList.toggle("nascosto", !banca.quesiti.some(q => q.domanda_aula));
  document.querySelectorAll("#impostazioni input, #impostazioni select").forEach(x => x.addEventListener("change", aggiornaConteggio));
  $("tutti").onclick = () => { box.querySelectorAll("input").forEach(c => { c.checked = true; }); aggiornaConteggio(); };
  $("nessuno").onclick = () => { box.querySelectorAll("input").forEach(c => { c.checked = false; }); aggiornaConteggio(); };
  document.querySelectorAll(".tab").forEach(t => { t.onclick = () => scegliModo(t.dataset.modo); });
  $("azzera").onclick = () => {
    if (confirm("Cancellare tutte le risposte salvate in questo browser?")) { progressi = {}; salvaProgressi(); aggiornaConteggio(); }
  };
  $("inizia").onclick = inizia;
}

// --- prova -------------------------------------------------------------------------
function inizia() {
  let lista = filtrati();
  if (modo === "studio") lista.sort((a, b) => (ordineArg[a.argomento] - ordineArg[b.argomento]) || (a.difficolta - b.difficolta) || a.id.localeCompare(b.id));
  else mescola(lista);
  if (modo === "simulazione") lista = lista.slice(0, Math.max(1, +$("n-quesiti").value || 30));
  prova = {
    modo, i: 0, voci: lista.map(q => ({ q, ordine: mescola(["A", "B", "C", "D"]), risposta: null, vista: false })),
    fine: modo === "simulazione" && +$("tempo").value ? Date.now() + 60000 * +$("tempo").value : 0,
  };
  $("impostazioni").classList.add("nascosto"); $("risultato").classList.add("nascosto"); $("prova").classList.remove("nascosto");
  clearInterval(intervallo);
  if (prova.fine) { intervallo = setInterval(aggiornaTimer, 1000); aggiornaTimer(); } else $("timer").textContent = "";
  mostra();
  window.scrollTo(0, 0);
}
function aggiornaTimer() {
  const resto = Math.max(0, prova.fine - Date.now());
  $("timer").textContent = `⏱ ${Math.floor(resto / 60000)}:${String(Math.floor(resto / 1000) % 60).padStart(2, "0")}`;
  if (!resto) { clearInterval(intervallo); alert("Tempo scaduto."); termina(); }
}
const immediata = () => prova.modo !== "simulazione";
function mostra() {
  const v = prova.voci[prova.i], q = v.q, n = prova.voci.length;
  $("posizione").textContent = `Quesito ${prova.i + 1} di ${n}`;
  $("barra").style.width = `${100 * (prova.i + 1) / n}%`;
  if (immediata()) {
    const date = prova.voci.filter(x => x.risposta);
    $("punteggio").textContent = date.length ? `${date.filter(x => x.risposta === x.q.corretta).length} esatte su ${date.length}` : "";
  } else $("punteggio").textContent = `${prova.voci.filter(x => x.risposta).length} risposte date`;
  $("etichette").replaceChildren(...[
    el("span", { class: "pill" }, etichettaArg[q.argomento] || q.argomento),
    el("span", { class: "pill" }, TIPI[q.tipo] || q.tipo),
    el("span", { class: "pill" }, "difficoltà " + q.difficolta),
    q.lezione ? el("span", { class: "pill" }, "lezione " + q.lezione) : null,
    q.test_vernice ? el("span", { class: "pill test" }, "punto d'esame") : null,
    q.domanda_aula ? el("span", { class: "pill" }, "domanda in aula") : null].filter(Boolean));
  $("domanda").textContent = q.domanda;
  const chiusa = immediata() && (v.risposta || v.vista);
  const box = $("opzioni"); box.replaceChildren();
  v.ordine.forEach((orig, k) => {
    const b = el("button", { class: "opzione", type: "button" }, el("span", { class: "lettera" }, "ABCD"[k]), el("span", {}, q.opzioni[orig]));
    if (chiusa) {
      b.disabled = true;
      if (orig === q.corretta) b.classList.add("giusta");
      else if (orig === v.risposta) b.classList.add("sbagliata");
    } else if (orig === v.risposta) b.classList.add("scelta");
    b.onclick = () => rispondi(orig);
    box.append(b);
  });
  $("correzione").replaceChildren(chiusa ? correzione(v) : "");
  $("indietro").disabled = prova.i === 0;
  $("soluzione").classList.toggle("nascosto", !immediata() || chiusa);
  $("avanti").textContent = prova.i === n - 1 ? (immediata() ? "Fine" : "Consegna") : "Successivo ›";
  $("termina").classList.toggle("nascosto", prova.i === n - 1);
}
function rispondi(lettera) {
  const v = prova.voci[prova.i];
  v.risposta = lettera;
  if (immediata()) registra(v.q.id, lettera === v.q.corretta);
  mostra();
  if (immediata()) $("correzione").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function correzione(v) {
  const q = v.q, giusta = v.risposta === q.corretta;
  const lettera = "ABCD"[v.ordine.indexOf(q.corretta)];
  const esito = v.risposta ? (giusta ? el("p", { class: "esito ok" }, "Risposta esatta.") : el("p", { class: "esito ko" }, `Risposta errata: quella esatta è la ${lettera}.`))
    : el("p", { class: "esito ko" }, `Soluzione: ${lettera}.`);
  const sp = el("div", { class: "spiegazione" });
  q.spiegazione.split(/\n+/).forEach(t => sp.append(el("p", {}, t)));
  if (q.riferimenti && q.riferimenti.length) sp.append(el("p", { class: "rif" }, "Riferimenti: " + q.riferimenti.join("; ")));
  if (q.fonti && q.fonti.length) sp.append(el("p", { class: "rif" }, "Per approfondire: " + q.fonti.join("; ")));
  const url = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent("Quesito " + q.id + ": ")}&body=${encodeURIComponent("Quesito: " + q.id + "\n\nChe cosa non va:\n\nNorma o pagina che lo dimostra:\n")}`;
  sp.append(el("p", { class: "rif" }, el("a", { href: url, target: "_blank", rel: "noopener" }, "Segnala un errore"), ` · codice ${q.id}`));
  return el("div", {}, esito, sp);
}
function termina() {
  clearInterval(intervallo);
  if (!immediata()) prova.voci.forEach(v => { if (v.risposta) registra(v.q.id, v.risposta === v.q.corretta); });
  const date = prova.voci.filter(v => v.risposta || v.vista);
  const giuste = prova.voci.filter(v => v.risposta === v.q.corretta).length;
  const tot = immediata() ? date.length : prova.voci.length;
  $("prova").classList.add("nascosto"); $("risultato").classList.remove("nascosto");
  $("voto").textContent = `${giuste} / ${tot}`;
  const perc = tot ? Math.round(100 * giuste / tot) : 0;
  $("giudizio").textContent = `${perc}% di risposte esatte` + (immediata() ? "" : `; ${prova.voci.filter(v => !v.risposta).length} senza risposta`) + ".";
  revisione(false);
  window.scrollTo(0, 0);
}
function revisione(soloErrate) {
  const box = $("revisione"); box.replaceChildren(el("h2", {}, soloErrate ? "Le risposte errate" : "Revisione"));
  prova.voci.forEach((v, k) => {
    if (!(v.risposta || v.vista) && immediata()) return;
    if (soloErrate && v.risposta === v.q.corretta) return;
    const opz = el("div", { class: "opzioni" });
    v.ordine.forEach((orig, j) => {
      const b = el("button", { class: "opzione", type: "button" }, el("span", { class: "lettera" }, "ABCD"[j]), el("span", {}, v.q.opzioni[orig]));
      b.disabled = true;
      if (orig === v.q.corretta) b.classList.add("giusta"); else if (orig === v.risposta) b.classList.add("sbagliata");
      opz.append(b);
    });
    box.append(el("div", { class: "rivedi" }, el("p", { class: "domanda" }, `${k + 1}. ${v.q.domanda}`), opz, correzione(v)));
  });
  if (box.children.length === 1) box.append(el("p", {}, "Nessuna risposta errata."));
}
function torna() {
  clearInterval(intervallo); prova = null;
  ["prova", "risultato"].forEach(s => $(s).classList.add("nascosto"));
  $("impostazioni").classList.remove("nascosto"); aggiornaConteggio(); window.scrollTo(0, 0);
}
$("avanti").onclick = () => { if (prova.i < prova.voci.length - 1) { prova.i++; mostra(); window.scrollTo(0, 0); } else termina(); };
$("indietro").onclick = () => { if (prova.i > 0) { prova.i--; mostra(); window.scrollTo(0, 0); } };
$("soluzione").onclick = () => {
  const v = prova.voci[prova.i]; v.vista = true; registra(v.q.id, false); mostra();
  $("correzione").scrollIntoView({ behavior: "smooth", block: "nearest" });
};
$("termina").onclick = () => { if (immediata() || confirm("Consegnare la prova adesso?")) termina(); };
$("nuova").onclick = torna;
$("solo-errate").onclick = () => revisione(true);
document.addEventListener("keydown", e => {
  if (!prova || $("prova").classList.contains("nascosto") || e.target.matches("input, select")) return;
  const k = "abcd".indexOf(e.key.toLowerCase());
  const bottoni = $("opzioni").querySelectorAll("button:not(:disabled)");
  if (k >= 0 && bottoni[k]) bottoni[k].click();
  else if (e.key === "ArrowRight" || e.key === "Enter") $("avanti").click();
  else if (e.key === "ArrowLeft") $("indietro").click();
});

fetch("banca_dati.json", { cache: "no-cache" }).then(r => r.json()).then(b => {
  banca = b;
  costruisciImpostazioni();
  scegliModo(location.hash.slice(1));
  addEventListener("hashchange", () => { if (!prova) scegliModo(location.hash.slice(1)); });
}).catch(() => {
  $("impostazioni").replaceChildren(el("p", { class: "avviso" }, "Banca dati non disponibile: riprova più tardi."));
});
