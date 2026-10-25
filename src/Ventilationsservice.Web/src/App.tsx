import { useEffect, useMemo, useState, type FormEvent } from "react";

type ServiceCase = { id: string; ventilationUnitId: string; title: string; description: string | null; dueDate: string; status: "Open" | "Completed"; createdAt: string; completedAt: string | null };
type Unit = { id: string; assetNumber: string; location: string; manufacturer: string | null; model: string | null; serviceCases?: ServiceCase[] };

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? error?.title ?? `API-fel: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export default function App() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [cases, setCases] = useState<ServiceCase[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [unitOpen, setUnitOpen] = useState(false);
  const [caseUnit, setCaseUnit] = useState<Unit | null>(null);

  async function refresh() {
    try {
      setError("");
      const [u, c] = await Promise.all([api<Unit[]>("/api/units"), api<ServiceCase[]>("/api/service-cases")]);
      setUnits(u); setCases(c);
    } catch (e) { setError(e instanceof Error ? e.message : "Kunde inte ansluta till API:t."); }
  }
  useEffect(() => { void refresh(); }, []);

  const openCases = cases.filter((c) => c.status === "Open");
  const today = new Date().toISOString().slice(0, 10);
  const overdue = openCases.filter((c) => c.dueDate < today);
  const upcoming = openCases.filter((c) => c.dueDate >= today && c.dueDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const filteredCases = (filter === "upcoming" ? upcoming : filter === "overdue" ? overdue : openCases).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const filteredUnits = useMemo(() => units.filter((u) => `${u.assetNumber} ${u.location} ${u.manufacturer ?? ""} ${u.model ?? ""}`.toLowerCase().includes(search.toLowerCase())), [units, search]);

  async function submitUnit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    try {
      await api("/api/units", { method: "POST", body: JSON.stringify({ assetNumber: form.get("assetNumber"), location: form.get("location"), manufacturer: form.get("manufacturer") || null, model: form.get("model") || null }) });
      setUnitOpen(false); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Kunde inte skapa aggregatet."); }
  }
  async function submitCase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!caseUnit) return; const form = new FormData(e.currentTarget);
    try {
      await api(`/api/units/${caseUnit.id}/service-cases`, { method: "POST", body: JSON.stringify({ title: form.get("title"), description: form.get("description") || null, dueDate: form.get("dueDate") }) });
      setCaseUnit(null); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Kunde inte skapa ärendet."); }
  }
  async function complete(id: string) {
    try { await api(`/api/service-cases/${id}/complete`, { method: "POST" }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Kunde inte avsluta ärendet."); }
  }
  const date = (s: string) => new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(s.slice(0, 10) + "T00:00:00"));

  return <div className="layout">
    <aside><div className="brand"><span>◉</span><div><b>luftkoll</b><small>SERVICEÖVERSIKT</small></div></div><p className="muted label">ARBETSYTA</p><a className="nav active" href="#">▦　Översikt</a><a className="nav" href="#units">▤　Aggregat <span>{units.length}</span></a><a className="nav" href="#cases">◷　Serviceärenden</a><div className="connection"><i/>API anslutet<small>Portfolio · Version 0.1</small></div></aside>
    <main><header>Arbetsyta　›　<strong>Översikt</strong><button className="refresh" onClick={() => void refresh()}>↻ Uppdatera</button></header><div className="content">
      <section className="heading"><div><small className="label">VENTILATIONSSERVICE</small><h1>Serviceöversikt</h1><p>Håll koll på dina ventilationsaggregat och serviceärenden.</p></div><button className="primary" onClick={() => setUnitOpen(true)}>＋ Lägg till aggregat</button></section>
      {error && <div className="error">{error}</div>}
      <section className="stats"><Stat title="Registrerade aggregat" value={units.length} /><Stat title="Öppna serviceärenden" value={openCases.length} /><Stat title="Förfaller inom 30 dagar" value={upcoming.length} /><Stat title="Försenade ärenden" value={overdue.length} /></section>
      <section className="panel" id="cases"><div className="panel-head"><div><small className="label">ATT GÖRA</small><h2>Serviceärenden</h2></div><div className="tabs">{[["all","Alla öppna"],["upcoming","Kommande"],["overdue","Försenade"]].map(([id,label]) => <button key={id} className={filter===id?"selected":""} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
        {filteredCases.length===0 ? <div className="empty">Inga ärenden i det här urvalet.</div> : <div>{filteredCases.map(c => { const u=units.find(x=>x.id===c.ventilationUnitId); return <article className="case" key={c.id}><span className="case-mark">◷</span><div className="case-title"><b>{c.title}</b><small>{u?.assetNumber} · {u?.location}</small></div><span className={c.dueDate<today?"late":"due"}>{c.dueDate<today?"Förfallen":"Förfaller"} {date(c.dueDate)}</span><button className="finish" onClick={() => void complete(c.id)}>✓ Klarmarkera</button></article>; })}</div>}
      </section>
      <section className="panel" id="units"><div className="panel-head"><div><small className="label">REGISTER</small><h2>Ventilationsaggregat</h2></div><input className="search" placeholder="⌕  Sök aggregat…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
        {filteredUnits.length===0 ? <div className="empty">Inga aggregat matchar sökningen.</div> : <div className="units">{filteredUnits.map(u=><article className="unit" key={u.id}><div className="unit-top"><span className="unit-symbol">◉</span><b>{u.assetNumber}</b><button title="Skapa serviceärende" onClick={()=>setCaseUnit(u)}>＋</button></div><h3>{u.location}</h3><p>{[u.manufacturer,u.model].filter(Boolean).join(" · ") || "Tillverkare och modell saknas"}</p><div className="unit-bottom">{u.serviceCases?.filter(c=>c.status==="Open").length ?? cases.filter(c=>c.ventilationUnitId===u.id&&c.status==="Open").length} öppna ärenden <button onClick={()=>setCaseUnit(u)}>＋ Nytt ärende</button></div></article>)}</div>}
      </section><footer>ASP.NET Core · EF Core · SQLite · React + TypeScript</footer>
    </div></main>
    {unitOpen && <Modal title="Registrera aggregat" close={()=>setUnitOpen(false)}><form onSubmit={submitUnit}><Field label="Inventarienummer *" name="assetNumber" required placeholder="Ex. VENT-002"/><Field label="Plats *" name="location" required placeholder="Ex. Kontor, plan 3"/><div className="two"><Field label="Tillverkare" name="manufacturer" placeholder="Ex. Swegon"/><Field label="Modell" name="model" placeholder="Ex. GOLD RX"/></div><div className="actions"><button type="button" onClick={()=>setUnitOpen(false)}>Avbryt</button><button className="primary">Spara aggregat</button></div></form></Modal>}
    {caseUnit && <Modal title="Nytt serviceärende" close={()=>setCaseUnit(null)}><p className="modal-note">Kopplas till <b>{caseUnit.assetNumber}</b> · {caseUnit.location}</p><form onSubmit={submitCase}><Field label="Rubrik *" name="title" required placeholder="Ex. Kontrollera filter"/><label className="field">Beskrivning<textarea name="description" placeholder="Kort beskrivning av arbetet"/></label><Field label="Förfallodatum *" name="dueDate" required type="date" defaultValue={new Date(Date.now()+14*86400000).toISOString().slice(0,10)}/><div className="actions"><button type="button" onClick={()=>setCaseUnit(null)}>Avbryt</button><button className="primary">Skapa ärende</button></div></form></Modal>}
  </div>;
}
function Stat({title,value}:{title:string;value:number}) { return <article className="stat"><small>{title}</small><b>{value}</b></article>; }
function Field(props:{label:string;name:string;required?:boolean;placeholder?:string;type?:string;defaultValue?:string}) { return <label className="field">{props.label}<input name={props.name} required={props.required} placeholder={props.placeholder} type={props.type??"text"} defaultValue={props.defaultValue}/></label>; }
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}) { return <div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><section className="modal" role="dialog" aria-modal="true"><div className="modal-head"><h2>{title}</h2><button onClick={close}>×</button></div>{children}</section></div>; }

