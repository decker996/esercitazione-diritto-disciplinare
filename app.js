"use strict";
// Esercitazione sulla banca dati (banca_dati.json, generato da quiz.py esporta).
const REPO = "decker996/esercitazione-diritto-disciplinare";
const CHIAVE = "dd-progressi-v1";
const TIPI = {
  nozione: "Nozione", normativo: "Normativo", procedura: "Procedura", termini: "Termini", competenza: "Competenza",
  caso_pratico: "Caso pratico", giurisprudenza: "Giurisprudenza", confronto: "Confronto",
};
const MODI = {
  esame: "I quesiti di livello d'esame, scritti come quelli del docente (Ten. Col. Dell'Olio): domande brevi e senza appigli, affermazioni da valutare una per una, opzioni che cambiano per una sola parola, nomi esatti degli istituti, estremi di atti e sentenze. Ci sono anche i quesiti dei suoi test intermedi. Al passo 2 scegli come esercitarti.",
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
let modo = "studio", ambito = "tutto", prova = null, intervallo = null;
// modalità Dell'Olio: «prova» (30, correzione alla consegna), «tutti» o «nuovi» (correzione dopo ogni risposta)
const ESAME = {
  prova: { nome: "Prova d'esame", inizia: "Inizia la prova d'esame" },
  tutti: { nome: "Tutti i quesiti d'esame", inizia: "Inizia l'esercitazione" },
  nuovi: { nome: "Quesiti d'esame nuovi", inizia: "Continua con i nuovi" },
};
let esame = "prova";
const SCELTE = "dd-scelte-v1";

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
const spuntati = sel => new Set([...document.querySelectorAll(sel + " input[value]:checked")].map(c => c.value));
const dataIt = d => d ? d.split("-").reverse().join(".") : "";
const elenco = v => v.length > 1 ? v.slice(0, -1).join(", ") + " e " + v[v.length - 1] : v.join("");
function nelPerimetro(q, lezioni, argomenti) {
  if (ambito === "lezioni") return lezioni.has(String(q.lezione));
  if (ambito === "argomenti") return argomenti.has(q.argomento);
  return true;
}
// prove con la correzione alla fine: simulazione libera ed esame stile Dell'Olio
const aConsegna = m => m === "simulazione" || m === "esame";
function livelloEsame() {
  const lezioni = spuntati("#lezioni"), argomenti = spuntati("#argomenti");
  return banca.quesiti.filter(q => q.difficolta === 4 && nelPerimetro(q, lezioni, argomenti));
}
function filtrati() {
  const lezioni = spuntati("#lezioni"), argomenti = spuntati("#argomenti");
  // l'esame stile Dell'Olio usa solo i quesiti di livello d'esame (difficoltà 4, compresi i test del docente)
  if (modo === "esame") return livelloEsame().filter(q => esame !== "nuovi" || !progressi[q.id]);
  const tipo = $("tipo").value, diff = $("difficolta").value;
  return banca.quesiti.filter(q =>
    nelPerimetro(q, lezioni, argomenti) && (!tipo || q.tipo === tipo) &&
    (!diff || String(q.difficolta) === diff) && (!$("solo-test").checked || q.test_vernice) &&
    (!$("solo-aula").checked || q.domanda_aula) && (!$("mai-visti").checked || !progressi[q.id]) &&
    (modo !== "ripasso" || (progressi[q.id] && progressi[q.id].u === false)));
}
function descriviAmbito() {
  if (ambito === "lezioni") {
    const n = [...spuntati("#lezioni")].map(Number).sort((a, b) => a - b);
    return n.length ? (n.length === 1 ? "Lezione " : "Lezioni ") + elenco(n.map(String)) : "";
  }
  if (ambito === "argomenti") {
    const s = [...spuntati("#argomenti")];
    return s.length ? (s.length === 1 ? etichettaArg[s[0]] : `${s.length} argomenti`) : "";
  }
  return "Tutta la banca";
}
// quanti quesiti entrano nella prova: nella prova d'esame 30; nella simulazione il numero scelto; altrove tutti
function quantiInProva(n) {
  if (modo === "esame") return esame === "prova" ? Math.min(n, 30) : n;
  return modo === "simulazione" ? Math.min(n, +$("n-quesiti").value || 30) : n;
}
const esameSubito = () => modo === "esame" && esame !== "prova";
const tempoScelto = () => +(modo === "esame" ? $("tempo-esame").value : $("tempo").value);
function descriviFiltri() {
  if (modo === "esame") return [];
  const f = [];
  if ($("tipo").value) f.push(TIPI[$("tipo").value]);
  if ($("difficolta").value) f.push("difficoltà " + $("difficolta").value);
  if ($("solo-test").checked) f.push("punti d'esame");
  if ($("solo-aula").checked) f.push("domande in aula");
  if ($("mai-visti").checked) f.push("mai visti");
  return f;
}
function aggiornaParti() {
  document.querySelectorAll("#argomenti .parte").forEach(p => {
    const voci = [...p.querySelectorAll(".voci input")], scelti = voci.filter(c => c.checked).length;
    const tutta = p.querySelector(".tutta-parte");
    tutta.checked = scelti === voci.length; tutta.indeterminate = scelti > 0 && scelti < voci.length;
    p.querySelector(".scelti").textContent = scelti ? `${scelti} di ${voci.length} scelti` : `${voci.length} argomenti`;
  });
  document.querySelectorAll("#lezioni label").forEach(l => l.classList.toggle("attiva", l.querySelector("input").checked));
}
function aggiornaConteggio() {
  aggiornaParti();
  const n = filtrati().length, cosa = descriviAmbito(), filtri = descriviFiltri();
  const quanti = quantiInProva(n);
  $("filtri-attivi").textContent = filtri.length ? "attivi: " + filtri.join(", ") : "nessun filtro attivo";
  $("box-filtri").classList.toggle("con-filtri", filtri.length > 0);
  $("riepilogo").textContent = cosa ? (modo === "esame" ? `${ESAME[esame].nome} · ` : "") + cosa
    + (filtri.length ? " · " + filtri.join(", ") : "") : "";
  $("conteggio").textContent = !cosa ? (ambito === "lezioni" ? "Scegli almeno una lezione." : "Scegli almeno un argomento.")
    : modo === "esame" ? conteggioEsame(n, quanti)
    : n ? `${quanti} ${quanti === 1 ? "quesito" : "quesiti"}${n > quanti ? ` estratti a caso tra ${n}` : ""}`
    : modo === "ripasso" ? "Nessun errore da rivedere con queste scelte."
    : "Nessun quesito con queste scelte: togli qualche filtro.";
  if (modo === "esame") contaSchedeEsame();
  $("inizia").disabled = !n || !cosa;
  const errori = banca.quesiti.filter(q => progressi[q.id] && progressi[q.id].u === false).length;
  $("n-errori").textContent = errori ? `${errori} da rivedere` : "nessun errore da rivedere";
  const fatti = banca.quesiti.filter(q => progressi[q.id]);
  const giusti = fatti.filter(q => progressi[q.id].u).length;
  $("miei-progressi").innerHTML = `<span><b>${fatti.length} / ${banca.quesiti.length}</b>quesiti affrontati</span>` +
    `<span><b>${fatti.length ? Math.round(100 * giusti / fatti.length) : 0}%</b>esatti all'ultimo tentativo</span>` +
    `<span><b>${errori}</b>da rivedere</span>`;
  salvaScelte();
}
function conteggioEsame(n, quanti) {
  const tot = livelloEsame().length;
  if (!tot) return "Nessun quesito di livello d'esame con queste scelte: scegli altre lezioni o argomenti.";
  if (esame === "prova") return n > quanti ? `30 quesiti estratti a caso tra ${n} di livello d'esame` : `${n} quesiti di livello d'esame`;
  if (esame === "tutti") return `${n} quesiti di livello d'esame, in ordine casuale`;
  return n ? `${n} ${n === 1 ? "quesito" : "quesiti"} ancora da fare, su ${tot}`
    : "Li hai già fatti tutti: scegli «Tutti i quesiti» per ripeterli.";
}
// numeri sulle tre schede della modalità Dell'Olio, per le lezioni o gli argomenti scelti
function contaSchedeEsame() {
  const tutti = livelloEsame(), nuovi = tutti.filter(q => !progressi[q.id]).length;
  $("n-esame-prova").textContent = tutti.length > 30 ? `30 su ${tutti.length}` : `${tutti.length} quesiti`;
  $("n-esame-tutti").textContent = `${tutti.length} quesiti`;
  $("n-esame-nuovi").textContent = nuovi ? `${nuovi} da fare` : "nessuno da fare";
}
function salvaScelte() {
  try {
    localStorage.setItem(SCELTE, JSON.stringify({ ambito, esame, lezioni: [...spuntati("#lezioni")], argomenti: [...spuntati("#argomenti")] }));
  } catch { /* browser senza memoria */ }
}
function scegliModo(m) {
  modo = MODI[m] ? m : "studio";
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-pressed", t.dataset.modo === modo));
  $("descrizione-modo").textContent = MODI[modo];
  $("opzioni-simulazione").classList.toggle("nascosto", modo !== "simulazione");
  // l'esame ha un passo in più (come esercitarsi) e un perimetro fisso (livello d'esame): i filtri non servono
  $("passo-esame").classList.toggle("nascosto", modo !== "esame");
  ["passo-filtri", "box-filtri"].forEach(x => $(x).classList.toggle("nascosto", modo === "esame"));
  $("passo-ambito").querySelector(".num").textContent = modo === "esame" ? "3" : "2";
  $("titolo-ambito").textContent = modo === "esame" ? "Scegli su quali lezioni o argomenti" : "Scegli che cosa esercitare";
  const n4 = banca.quesiti.filter(q => q.difficolta === 4).length;
  $("n-tutto").textContent = modo === "esame" ? `${n4} quesiti d'esame` : `${banca.quesiti.length} quesiti`;
  aggiornaInizia();
  history.replaceState(null, "", "#" + modo);
  aggiornaConteggio();
}
function aggiornaInizia() {
  $("inizia").textContent = modo === "esame" ? ESAME[esame].inizia : modo === "simulazione" ? "Inizia la simulazione"
    : modo === "ripasso" ? "Inizia il ripasso" : "Inizia";
}
// modalità Dell'Olio: prova d'esame, tutti, solo nuovi; il tempo vale solo per la prova d'esame
function scegliEsame(e) {
  esame = ESAME[e] ? e : "prova";
  document.querySelectorAll("[data-esame]").forEach(b => b.setAttribute("aria-checked", b.dataset.esame === esame));
  $("riga-tempo-esame").classList.toggle("nascosto", esame !== "prova");
  aggiornaInizia();
  aggiornaConteggio();
}
function scegliAmbito(a) {
  ambito = ["tutto", "lezioni", "argomenti"].includes(a) ? a : "tutto";
  document.querySelectorAll("[data-ambito]").forEach(b => b.setAttribute("aria-checked", b.dataset.ambito === ambito));
  ["tutto", "lezioni", "argomenti"].forEach(x => $("pannello-" + x).classList.toggle("nascosto", x !== ambito));
  aggiornaConteggio();
}
function costruisciImpostazioni() {
  let salvate = {};
  try { salvate = JSON.parse(localStorage.getItem(SCELTE)) || {}; } catch { salvate = {}; }
  const conta = {};
  banca.quesiti.forEach(q => { conta[q.argomento] = (conta[q.argomento] || 0) + 1; });
  $("n-tutto").textContent = `${banca.quesiti.length} quesiti`;

  // argomenti raggruppati per parte (ordine della Sinossi)
  const parti = [];
  banca.argomenti.forEach((a, i) => {
    ordineArg[a.slug] = i; etichettaArg[a.slug] = a.titolo;
    if (!parti.length || parti[parti.length - 1].nome !== a.parte) parti.push({ nome: a.parte, voci: [] });
    parti[parti.length - 1].voci.push(a);
  });

  // lezioni: una scheda per giornata, con gli argomenti più presenti
  [...new Set(banca.quesiti.map(q => q.lezione).filter(Boolean))].sort((a, b) => a - b).forEach(n => {
    const qs = banca.quesiti.filter(x => x.lezione === n), per = {};
    qs.forEach(q => { per[q.argomento] = (per[q.argomento] || 0) + 1; });
    const temi = Object.keys(per).sort((a, b) => per[b] - per[a]);
    // i quesiti dei test del docente hanno la lezione ma non la data: la data si prende dai quesiti della lezione
    const data = (qs.find(q => q.data_lezione) || {}).data_lezione;
    const esame = qs.filter(q => q.difficolta === 4).length;
    const c = el("input", { type: "checkbox", value: String(n) }); c.checked = (salvate.lezioni || []).includes(String(n));
    $("lezioni").append(el("label", {}, c,
      el("span", { class: "titolo" }, `Lezione ${n}`),
      el("span", { class: "data" }, `${dataIt(data)} · ${qs.length} quesiti${esame ? ` (${esame} d'esame)` : ""}`),
      el("span", { class: "temi" }, temi.slice(0, 3).map(s => etichettaArg[s] || s).join(" · ") + (temi.length > 3 ? " …" : ""))));
  });

  // ogni parte si sceglie per intero o si apre per scegliere i singoli argomenti
  const box = $("argomenti");
  parti.forEach(p => {
    const tutta = el("input", { type: "checkbox", class: "tutta-parte" });
    const apri = el("button", { type: "button", class: "apri", "aria-expanded": "false" }, "argomenti ▾");
    const voci = el("div", { class: "voci nascosto" });
    p.voci.forEach(a => {
      const c = el("input", { type: "checkbox", value: a.slug }); c.checked = (salvate.argomenti || []).includes(a.slug);
      voci.append(el("label", { title: a.descrizione, "data-cerca": (a.titolo + " " + a.descrizione).toLowerCase() },
        c, el("span", {}, a.titolo), el("span", { class: "n" }, String(conta[a.slug] || 0))));
    });
    const quesiti = p.voci.reduce((t, a) => t + (conta[a.slug] || 0), 0);
    box.append(el("div", { class: "parte" },
      el("div", { class: "testa-parte" }, el("label", {}, tutta, el("b", {}, p.nome)),
        el("span", { class: "piccolo" }, el("span", { class: "scelti" }), ` · ${quesiti} quesiti`), apri), voci));
    tutta.onchange = () => { voci.querySelectorAll("input").forEach(c => { c.checked = tutta.checked; }); aggiornaConteggio(); };
    apri.onclick = () => {
      const chiusa = voci.classList.toggle("nascosto");
      apri.setAttribute("aria-expanded", String(!chiusa)); apri.textContent = chiusa ? "argomenti ▾" : "chiudi ▴";
    };
  });
  $("cerca-arg").oninput = () => {
    const t = $("cerca-arg").value.trim().toLowerCase();
    box.querySelectorAll(".parte").forEach(p => {
      let visibili = 0;
      p.querySelectorAll(".voci label").forEach(l => { const ok = !t || l.dataset.cerca.includes(t); l.classList.toggle("nascosto", !ok); visibili += ok; });
      p.classList.toggle("nascosto", !visibili);
      const voci = p.querySelector(".voci"), apri = p.querySelector(".apri");
      voci.classList.toggle("nascosto", !t); apri.classList.toggle("nascosto", !!t);
      apri.textContent = "argomenti ▾"; apri.setAttribute("aria-expanded", "false");
    });
  };

  Object.entries(TIPI).forEach(([k, v]) => { if (banca.quesiti.some(q => q.tipo === k)) $("tipo").append(el("option", { value: k }, v)); });
  $("solo-test").closest("label").classList.toggle("nascosto", !banca.quesiti.some(q => q.test_vernice));
  $("solo-aula").closest("label").classList.toggle("nascosto", !banca.quesiti.some(q => q.domanda_aula));
  document.querySelectorAll("#impostazioni input, #impostazioni select").forEach(x => x.addEventListener("change", aggiornaConteggio));
  document.querySelectorAll("[data-esame]").forEach(b => { b.onclick = () => scegliEsame(b.dataset.esame); });
  const tutte = (sel, v) => () => { document.querySelectorAll(sel + " input").forEach(c => { c.checked = v; }); aggiornaConteggio(); };
  // con una ricerca in corso, «Seleziona tutti» prende solo gli argomenti trovati
  $("tutti").onclick = tutte("#argomenti .voci label:not(.nascosto)", true); $("nessuno").onclick = tutte("#argomenti", false);
  $("lez-tutte").onclick = tutte("#lezioni", true); $("lez-nessuna").onclick = tutte("#lezioni", false);
  $("azzera-filtri").onclick = () => {
    $("tipo").value = ""; $("difficolta").value = "";
    ["solo-test", "solo-aula", "mai-visti"].forEach(x => { $(x).checked = false; });
    aggiornaConteggio();
  };
  document.querySelectorAll(".tab").forEach(t => { t.onclick = () => scegliModo(t.dataset.modo); });
  document.querySelectorAll("[data-ambito]").forEach(b => { b.onclick = () => scegliAmbito(b.dataset.ambito); });
  $("azzera").onclick = () => {
    if (confirm("Cancellare tutte le risposte salvate in questo browser?")) { progressi = {}; salvaProgressi(); aggiornaConteggio(); }
  };
  $("inizia").onclick = inizia;
  ambito = salvate.ambito || "tutto";
  esame = ESAME[salvate.esame] ? salvate.esame : "prova";
}

// --- prova -------------------------------------------------------------------------
function inizia() {
  let lista = filtrati();
  if (modo === "studio") lista.sort((a, b) => (ordineArg[a.argomento] - ordineArg[b.argomento]) || (a.difficolta - b.difficolta) || a.id.localeCompare(b.id));
  else mescola(lista);
  lista = lista.slice(0, Math.max(1, quantiInProva(lista.length)));
  const subito = !aConsegna(modo) || esameSubito();
  // la risposta esatta cade in A, B, C e D lo stesso numero di volte, in ordine casuale; le altre si mescolano
  const posti = mescola(lista.map((_, k) => k % 4));
  prova = {
    modo, subito, i: 0, voci: lista.map((q, k) => {
      const ordine = mescola(["A", "B", "C", "D"].filter(x => x !== q.corretta));
      ordine.splice(posti[k], 0, q.corretta);
      return { q, ordine, risposta: null, vista: false };
    }),
    fine: !subito && tempoScelto() ? Date.now() + 60000 * tempoScelto() : 0,
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
const immediata = () => prova.subito;
function pillole(q) {
  return [
    el("span", { class: "pill" }, etichettaArg[q.argomento] || q.argomento),
    el("span", { class: "pill" }, TIPI[q.tipo] || q.tipo),
    q.difficolta === 4 ? el("span", { class: "pill esame" }, "livello d'esame · stile Dell'Olio")
      : el("span", { class: "pill" }, "difficoltà " + q.difficolta),
    q.lezione ? el("span", { class: "pill" }, "lezione " + q.lezione) : null,
    q.test_docente ? el("span", { class: "pill test" }, "test del docente") : null,
    q.test_vernice ? el("span", { class: "pill test" }, "punto d'esame") : null,
    q.domanda_aula ? el("span", { class: "pill" }, "domanda in aula") : null].filter(Boolean);
}
function mostra() {
  const v = prova.voci[prova.i], q = v.q, n = prova.voci.length;
  $("posizione").textContent = `Quesito ${prova.i + 1} di ${n}`;
  $("barra").style.width = `${100 * (prova.i + 1) / n}%`;
  if (immediata()) {
    const date = prova.voci.filter(x => x.risposta);
    $("punteggio").textContent = date.length ? `${date.filter(x => x.risposta === x.q.corretta).length} esatte su ${date.length}` : "";
  } else $("punteggio").textContent = `${prova.voci.filter(x => x.risposta).length} risposte date`;
  // all'esame, come nel test del docente, il quesito si presenta senza etichette (argomento e tipo sarebbero un aiuto)
  $("etichette").replaceChildren(...(prova.modo === "esame" ? [] : pillole(q)));
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
  $("giudizio").textContent = (prova.modo === "esame" ? "Simulazione esame finale · stile Dell'Olio: " : "") +
    `${perc}% di risposte esatte` + (immediata() ? "" : `; ${prova.voci.filter(v => !v.risposta).length} senza risposta`) + ".";
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
    box.append(el("div", { class: "rivedi" }, el("div", {}, ...pillole(v.q)),
      el("p", { class: "domanda" }, `${k + 1}. ${v.q.domanda}`), opz, correzione(v)));
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
  scegliAmbito(ambito);
  scegliModo(location.hash.slice(1));
  scegliEsame(esame);
  addEventListener("hashchange", () => { if (!prova) scegliModo(location.hash.slice(1)); });
}).catch(() => {
  $("impostazioni").replaceChildren(el("p", { class: "avviso" }, "Banca dati non disponibile: riprova più tardi."));
});
