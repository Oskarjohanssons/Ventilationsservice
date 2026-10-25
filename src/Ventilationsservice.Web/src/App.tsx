import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { manufacturers, productsForManufacturer } from "./data/ventilationCatalog";

type ServiceCase = {
  id: string;
  ventilationUnitId: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: "Open" | "Completed";
  createdAt: string;
  completedAt: string | null;
};

type Unit = {
  id: string;
  assetNumber: string;
  location: string;
  manufacturer: string | null;
  model: string | null;
};

type UnitDetails = Unit & { serviceCases: ServiceCase[] };

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? error?.title ?? `API-fel: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export default function App() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [cases, setCases] = useState<ServiceCase[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeSection, setActiveSection] = useState<"overview" | "units" | "cases">("overview");
  const [error, setError] = useState("");
  const [unitOpen, setUnitOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [manufacturer, setManufacturer] = useState("");
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [caseUnitId, setCaseUnitId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<UnitDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function refresh() {
    try {
      setError("");
      const [unitData, caseData] = await Promise.all([
        api<Unit[]>("/api/units"),
        api<ServiceCase[]>("/api/service-cases"),
      ]);
      setUnits(unitData);
      setCases(caseData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte ansluta till API:t.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const caseUnit = units.find((unit) => unit.id === caseUnitId) ?? null;

  function openNewUnitForm() {
    setEditingUnit(null);
    setManufacturer("");
    setUnitOpen(true);
  }

  function openEditUnitForm(unit: Unit) {
    setEditingUnit(unit);
    setManufacturer(unit.manufacturer ?? "");
    setUnitOpen(true);
  }

  function closeUnitForm() {
    setUnitOpen(false);
    setEditingUnit(null);
  }

  function openCaseForm(unit?: Unit) {
    setCaseUnitId(unit?.id ?? "");
    setCaseModalOpen(true);
  }

  function navigateTo(section: "overview" | "units" | "cases") {
    setActiveSection(section);
  }
  async function showUnitDetails(unit: Unit) {
    setDetailLoading(true);
    setSelectedUnit(null);
    try {
      const details = await api<UnitDetails>(`/api/units/${unit.id}`);
      setSelectedUnit(details);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte hämta aggregatets historik.");
    } finally {
      setDetailLoading(false);
    }
  }

  const openCases = cases.filter((item) => item.status === "Open");
  const today = new Date().toISOString().slice(0, 10);
  const upcomingLimit = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const overdue = openCases.filter((item) => item.dueDate < today);
  const upcoming = openCases.filter((item) => item.dueDate >= today && item.dueDate <= upcomingLimit);
  const filteredCases = (filter === "upcoming" ? upcoming : filter === "overdue" ? overdue : openCases)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const filteredUnits = useMemo(
    () => units.filter((unit) =>
      `${unit.assetNumber} ${unit.location} ${unit.manufacturer ?? ""} ${unit.model ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase())),
    [units, search],
  );

  async function submitUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api<Unit>(editingUnit ? `/api/units/${editingUnit.id}` : "/api/units", {
        method: editingUnit ? "PUT" : "POST",
        body: JSON.stringify({
          assetNumber: form.get("assetNumber"),
          location: form.get("location"),
          manufacturer: form.get("manufacturer") || null,
          model: form.get("model") || null,
        }),
      });
      closeUnitForm();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte spara aggregatet.");
    }
  }

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const unitId = String(form.get("ventilationUnitId") ?? "");
    if (!unitId) return;
    try {
      await api<ServiceCase>(`/api/units/${unitId}/service-cases`, {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description") || null,
          dueDate: form.get("dueDate"),
        }),
      });
      setCaseModalOpen(false);
      setCaseUnitId("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte skapa ärendet.");
    }
  }

  async function completeCase(id: string) {
    try {
      await api<ServiceCase>(`/api/service-cases/${id}/complete`, { method: "POST" });
      if (selectedUnit) {
        const updatedDetails = await api<UnitDetails>(`/api/units/${selectedUnit.id}`);
        setSelectedUnit(updatedDetails);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte avsluta ärendet.");
    }
  }

  function startCaseFromDetails() {
    if (!selectedUnit) return;
    setCaseUnitId(selectedUnit.id);
    setCaseModalOpen(true);
    setSelectedUnit(null);
  }

  return (
    <div className="layout">
      <aside>
        <div className="brand">
          <span>◉</span>
          <div><b>luftkoll</b><small>SERVICEÖVERSIKT</small></div>
        </div>
        <p className="muted label">ARBETSYTA</p>
        <button type="button" className={`nav ${activeSection === "overview" ? "active" : ""}`} aria-current={activeSection === "overview" ? "location" : undefined} onClick={() => navigateTo("overview")}>▦　Översikt</button>
        <button type="button" className={`nav ${activeSection === "units" ? "active" : ""}`} aria-current={activeSection === "units" ? "location" : undefined} onClick={() => navigateTo("units")}>▤　Aggregat <span>{units.length}</span></button>
        <button type="button" className={`nav ${activeSection === "cases" ? "active" : ""}`} aria-current={activeSection === "cases" ? "location" : undefined} onClick={() => navigateTo("cases")}>◷　Serviceärenden</button>
        <div className="connection"><i />API anslutet<small>Portfolio · Version 0.1</small></div>
      </aside>

      <main>
        <header>
          Arbetsyta　›　<strong>Översikt</strong>
          <button className="refresh" onClick={() => void refresh()}>↻ Uppdatera</button>
        </header>
        <div className="content">
          <section className="heading" id="overview">
            <div>
              <small className="label">VENTILATIONSSERVICE</small>
              <h1>{activeSection === "overview" ? "Serviceöversikt" : activeSection === "units" ? "Ventilationsaggregat" : "Serviceärenden"}</h1>
              <p>{activeSection === "overview" ? "Håll koll på dina ventilationsaggregat och serviceärenden." : activeSection === "units" ? "Sök bland aggregat och öppna deras servicehistorik." : "Följ öppna, kommande och försenade serviceärenden."}</p>
            </div>
            {activeSection === "cases" ? (
              <button className="primary" disabled={units.length === 0} title={units.length === 0 ? "Registrera ett aggregat först" : undefined} onClick={() => openCaseForm()}>＋ Nytt serviceärende</button>
            ) : (
              <button className="primary" onClick={openNewUnitForm}>＋ Lägg till aggregat</button>
            )}
          </section>

          {error && <div className="error">{error}</div>}

          <section className="stats" hidden={activeSection !== "overview"}>
            <Stat title="Registrerade aggregat" value={units.length} />
            <Stat title="Öppna serviceärenden" value={openCases.length} />
            <Stat title="Förfaller inom 30 dagar" value={upcoming.length} />
            <Stat title="Försenade ärenden" value={overdue.length} />
          </section>

          <section className="panel" id="cases" hidden={activeSection === "units"}>
            <div className="panel-head">
              <div><small className="label">ATT GÖRA</small><h2>Serviceärenden</h2></div>
              <div className="tabs">
                {[
                  ["all", "Alla öppna"],
                  ["upcoming", "Kommande"],
                  ["overdue", "Försenade"],
                ].map(([id, label]) => (
                  <button key={id} className={filter === id ? "selected" : ""} onClick={() => setFilter(id)}>{label}</button>
                ))}
              </div>
            </div>

            {filteredCases.length === 0 ? (
              <div className="empty">Inga ärenden i det här urvalet.</div>
            ) : (
              <div>
                {filteredCases.map((item) => {
                  const unit = units.find((candidate) => candidate.id === item.ventilationUnitId);
                  return (
                    <article className="case" key={item.id}>
                      <span className="case-mark">◷</span>
                      <div className="case-title">
                        <b>{item.title}</b>
                        <small>{unit?.assetNumber} · {unit?.location}</small>
                      </div>
                      <span className={item.dueDate < today ? "late" : "due"}>
                        {item.dueDate < today ? "Förfallen" : "Förfaller"} {formatDate(item.dueDate)}
                      </span>
                      <button className="finish" onClick={() => void completeCase(item.id)}>✓ Klarmarkera</button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel" id="units" hidden={activeSection === "cases"}>
            <div className="panel-head">
              <div><small className="label">REGISTER</small><h2>Ventilationsaggregat</h2></div>
              <input
                className="search"
                placeholder="⌕  Sök aggregat…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {filteredUnits.length === 0 ? (
              <div className="empty">Inga aggregat matchar sökningen.</div>
            ) : (
              <div className="units">
                {filteredUnits.map((unit) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    openCount={cases.filter((item) => item.ventilationUnitId === unit.id && item.status === "Open").length}
                    onView={() => void showUnitDetails(unit)}
                    onEdit={() => openEditUnitForm(unit)}
                    onAddCase={() => openCaseForm(unit)}
                  />
                ))}
              </div>
            )}
          </section>
          <footer>ASP.NET Core · EF Core · SQLite · React + TypeScript</footer>
        </div>
      </main>

      {unitOpen && (
        <Modal title={editingUnit ? "Redigera aggregat" : "Registrera aggregat"} close={closeUnitForm}>
          <form onSubmit={submitUnit}>
            <Field label="Inventarienummer *" name="assetNumber" required placeholder="Ex. VENT-002" defaultValue={editingUnit?.assetNumber ?? ""} />
            <Field label="Plats *" name="location" required placeholder="Ex. Kontor, plan 3" defaultValue={editingUnit?.location ?? ""} />
            <div className="two">
              <label className="field">
                Tillverkare
                <input name="manufacturer" list="manufacturer-options" placeholder="Skriv eller välj tillverkare" value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} />
                <datalist id="manufacturer-options">{manufacturers.map((name) => <option key={name} value={name} />)}</datalist>
              </label>
              <label className="field">
                Modell / produktserie
                <input name="model" list="model-options" placeholder="Skriv eller välj modell" defaultValue={editingUnit?.model ?? ""} />
                <datalist id="model-options">{productsForManufacturer(manufacturer).map((name) => <option key={name} value={name} />)}</datalist>
              </label>
            </div>
            <div className="actions">
              <button type="button" onClick={closeUnitForm}>Avbryt</button>
              <button className="primary">{editingUnit ? "Spara ändringar" : "Spara aggregat"}</button>
            </div>
          </form>
        </Modal>
      )}

      {caseModalOpen && (
        <Modal title="Nytt serviceärende" close={() => { setCaseModalOpen(false); setCaseUnitId(""); }}>
          {caseUnit && <p className="modal-note">Valt aggregat: <b>{caseUnit.assetNumber}</b> · {caseUnit.location}</p>}
          <form onSubmit={submitCase}>
            <label className="field">
              Ventilationsaggregat *
              <select name="ventilationUnitId" required value={caseUnitId} onChange={(event) => setCaseUnitId(event.target.value)}>
                <option value="" disabled>Välj aggregat…</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.assetNumber} — {unit.location} ({[unit.manufacturer, unit.model].filter(Boolean).join(" · ") || "Okänt märke"})
                  </option>
                ))}
              </select>
            </label>
            <Field label="Rubrik *" name="title" required placeholder="Ex. Kontrollera filter" />
            <label className="field">
              Beskrivning
              <textarea name="description" placeholder="Kort beskrivning av arbetet" />
            </label>
            <Field
              label="Förfallodatum *"
              name="dueDate"
              required
              type="date"
              defaultValue={new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)}
            />
            <div className="actions">
              <button type="button" onClick={() => { setCaseModalOpen(false); setCaseUnitId(""); }}>Avbryt</button>
              <button className="primary">Skapa ärende</button>
            </div>
          </form>
        </Modal>
      )}

      {detailLoading && (
        <Modal title="Aggregatets historik" close={() => setDetailLoading(false)}>
          <div className="empty">Hämtar aggregat och servicehistorik…</div>
        </Modal>
      )}

      {selectedUnit && (
        <UnitDetailsDialog
          unit={selectedUnit}
          close={() => setSelectedUnit(null)}
          addCase={startCaseFromDetails}
          completeCase={(id) => void completeCase(id)}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

function UnitCard({
  unit,
  openCount,
  onView,
  onEdit,
  onAddCase,
}: {
  unit: Unit;
  openCount: number;
  onView: () => void;
  onEdit: () => void;
  onAddCase: () => void;
}) {
  return (
    <article className="unit">
      <div className="unit-top">
        <span className="unit-symbol">◉</span>
        <b>{unit.assetNumber}</b>
        <button title="Redigera aggregat" aria-label={`Redigera ${unit.assetNumber}`} onClick={onEdit}>✎</button>
        <button title="Skapa serviceärende" aria-label={`Skapa serviceärende för ${unit.assetNumber}`} onClick={onAddCase}>＋</button>
      </div>
      <h3>{unit.location}</h3>
      <p>{[unit.manufacturer, unit.model].filter(Boolean).join(" · ") || "Tillverkare och modell saknas"}</p>
      <div className="unit-bottom"><span>{openCount} öppna ärenden</span></div>
      <div className="unit-actions">
        <button onClick={onView}>Visa servicehistorik →</button>
        <button onClick={onAddCase}>＋ Nytt ärende</button>
      </div>
    </article>
  );
}

function UnitDetailsDialog({
  unit,
  close,
  addCase,
  completeCase,
  formatDate,
}: {
  unit: UnitDetails;
  close: () => void;
  addCase: () => void;
  completeCase: (id: string) => void;
  formatDate: (value: string) => string;
}) {
  const openCount = unit.serviceCases.filter((item) => item.status === "Open").length;
  const completedCount = unit.serviceCases.length - openCount;

  return (
    <Modal title="Aggregatets servicehistorik" close={close}>
      <div className="detail-summary">
        <div>
          <small className="label">AGGREGAT</small>
          <h3>{unit.assetNumber}</h3>
          <p>{unit.location}</p>
          <span>{[unit.manufacturer, unit.model].filter(Boolean).join(" · ") || "Tillverkare och modell saknas"}</span>
        </div>
        <div className="detail-counts">
          <div><b>{unit.serviceCases.length}</b><small>Alla ärenden</small></div>
          <div><b>{openCount}</b><small>Öppna</small></div>
          <div><b>{completedCount}</b><small>Genomförda</small></div>
        </div>
      </div>

      <div className="history-heading">
        <div><small className="label">TIDIGARE OCH PLANERAT</small><h3>Serviceärenden</h3></div>
        <button className="primary" onClick={addCase}>＋ Nytt ärende</button>
      </div>

      {unit.serviceCases.length === 0 ? (
        <div className="empty history-empty">Inga serviceärenden har registrerats för aggregatet ännu.</div>
      ) : (
        <div className="history-list">
          {unit.serviceCases.map((item) => (
            <article className="history-item" key={item.id}>
              <div className="history-item-heading">
                <div><strong>{item.title}</strong><small>Skapat {formatDate(item.createdAt)}</small></div>
                <span className={item.status === "Completed" ? "status-chip completed" : "status-chip open"}>
                  {item.status === "Completed" ? "Genomfört" : "Öppet"}
                </span>
              </div>
              {item.description && <p>{item.description}</p>}
              <div className="history-item-footer">
                <span>Förfallodatum: {formatDate(item.dueDate)}</span>
                {item.completedAt && <span>Klarmarkerat: {formatDate(item.completedAt)}</span>}
                {item.status === "Open" && (
                  <button className="finish" onClick={() => completeCase(item.id)}>✓ Klarmarkera</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return <article className="stat"><small>{title}</small><b>{value}</b></article>;
}

function Field(props: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="field">
      {props.label}
      <input
        name={props.name}
        required={props.required}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        defaultValue={props.defaultValue}
      />
    </label>
  );
}

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div className="backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={close} aria-label="Stäng">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}
