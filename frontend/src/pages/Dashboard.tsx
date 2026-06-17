import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchDashboardKPIs } from "../api/dashboard";
import { BarChart, DonutChart, MultiBarChart } from "../components/dashboard/BarChart";
import { PriorityBadge } from "../components/PriorityBadge";
import { useAuth } from "../contexts/AuthContext";
import type { DashboardFilters, DashboardKPIs, DashboardPeriod } from "../types/dashboard";
import type { TenderFase, TenderSource } from "../types/tender";
import "./Dashboard.css";

const DEFAULT_FILTERS: DashboardFilters = {
  period: "90d",
  source: "",
  fase: "",
  doc_days: 30,
};

const FASE_LABELS: Record<string, string> = {
  da_analizzare: "Da analizzare",
  in_corso: "In corso",
  partecipabile: "Partecipabile",
  esclusa: "Esclusa",
  offerta: "Offerta",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manuale",
  scouting: "Scouting",
  telemat: "Telemat",
};

const FASE_COLORS: Record<string, string> = {
  da_analizzare: "#94a3b8",
  in_corso: "#3b82f6",
  partecipabile: "#22c55e",
  esclusa: "#ef4444",
  offerta: "#a78bfa",
};

const SOURCE_COLORS: Record<string, string> = {
  manual: "#64748b",
  scouting: "#16a34a",
  telemat: "#2563eb",
};

function formatImporto(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatScadenza(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function PanelSkeleton() {
  return (
    <div className="cc-panel cc-panel--loading">
      <div className="cc-panel__skeleton" />
    </div>
  );
}

function EmptyState({ message, linkTo, linkLabel }: { message: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="cc-empty">
      <p>{message}</p>
      {linkTo && linkLabel && <Link to={linkTo}>{linkLabel}</Link>}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  const kpisQuery = useQuery({
    queryKey: ["dashboard-kpis", filters],
    queryFn: () => fetchDashboardKPIs(filters),
    refetchInterval: 60000,
  });

  const kpis = kpisQuery.data;

  const faseSegments = useMemo(
    () =>
      Object.entries(kpis?.distribuzione.per_fase ?? {}).map(([key, value]) => ({
        label: FASE_LABELS[key] ?? key,
        value,
        color: FASE_COLORS[key] ?? "#94a3b8",
      })),
    [kpis]
  );

  const sourceSegments = useMemo(
    () =>
      Object.entries(kpis?.distribuzione.per_sorgente ?? {}).map(([key, value]) => ({
        label: SOURCE_LABELS[key] ?? key,
        value,
        color: SOURCE_COLORS[key] ?? "#94a3b8",
      })),
    [kpis]
  );

  return (
    <div className="control-center">
      <header className="cc-header">
        <div className="cc-header__title">
          <span className="cc-header__badge">DASHBOARD</span>
          <h2>Centro operativo gare</h2>
          <p>
            Benvenuto{user?.first_name ? `, ${user.first_name}` : ""}. Panoramica KPI, andamento temporale
            e attività operative.
          </p>
        </div>
        {kpis?.generated_at && (
          <div className="cc-header__meta">
            <span>Aggiornato il {formatScadenza(kpis.generated_at)}</span>
          </div>
        )}
      </header>

      <DashboardFiltersBar filters={filters} onChange={setFilters} loading={kpisQuery.isFetching} />

      {kpisQuery.isError && (
        <div className="cc-alert">
          Impossibile caricare i KPI. Verifica che il backend sia attivo.
        </div>
      )}

      <section className="cc-metrics cc-metrics--8">
        <MetricTile
          label="Gare importate"
          value={kpis?.indicatori.gare_importate}
          loading={kpisQuery.isLoading}
          accent="blue"
          linkTo="/tenders/imported"
        />
        <MetricTile
          label="Gare analizzate"
          value={kpis?.indicatori.gare_analizzate}
          loading={kpisQuery.isLoading}
          accent="blue"
        />
        <MetricTile
          label="Gare partecipabili"
          value={kpis?.indicatori.gare_partecipabili}
          loading={kpisQuery.isLoading}
          accent="green"
          linkTo="/tenders/board"
        />
        <MetricTile
          label="Gare RTI"
          value={kpis?.indicatori.gare_rti}
          loading={kpisQuery.isLoading}
          accent="violet"
          linkTo="/participation"
        />
        <MetricTile
          label="Gare avvalimento"
          value={kpis?.indicatori.gare_avvalimento}
          loading={kpisQuery.isLoading}
          accent="violet"
          linkTo="/participation"
        />
        <MetricTile
          label="Offerte in corso"
          value={kpis?.indicatori.offerte_in_corso}
          loading={kpisQuery.isLoading}
          accent="amber"
        />
        <MetricTile
          label="Offerte presentate"
          value={kpis?.indicatori.offerte_presentate}
          loading={kpisQuery.isLoading}
          accent="green"
        />
        <MetricTile
          label="Documenti in scadenza"
          value={kpis?.indicatori.documenti_in_scadenza}
          loading={kpisQuery.isLoading}
          accent={kpis && kpis.indicatori.documenti_in_scadenza > 0 ? "red" : "default"}
          urgent={!!kpis && kpis.indicatori.documenti_in_scadenza > 0}
          linkTo="/companies"
        />
      </section>

      <section className="cc-global-kpi">
        <GlobalKpiCard
          label="Valore gare aperte"
          value={kpis ? formatImporto(kpis.globali.importo_gare_aperte) : "—"}
          loading={kpisQuery.isLoading}
        />
        <GlobalKpiCard
          label="Valore totale portfolio"
          value={kpis ? formatImporto(kpis.globali.importo_totale) : "—"}
          loading={kpisQuery.isLoading}
        />
        <GlobalKpiCard
          label="Tasso analisi"
          value={kpis ? formatPercent(kpis.globali.tasso_analisi) : "—"}
          loading={kpisQuery.isLoading}
          hint="Gare analizzate / importate"
        />
        <GlobalKpiCard
          label="Tasso partecipabilità"
          value={kpis ? formatPercent(kpis.globali.tasso_partecipabilita) : "—"}
          loading={kpisQuery.isLoading}
          hint="Partecipabili / analizzate"
        />
        <GlobalKpiCard
          label="Conversione offerte"
          value={kpis ? formatPercent(kpis.globali.tasso_conversione_offerte) : "—"}
          loading={kpisQuery.isLoading}
          hint="Presentate / (in corso + presentate)"
        />
        <GlobalKpiCard
          label="Match verdi"
          value={kpis ? String(kpis.globali.match_verdi) : "—"}
          loading={kpisQuery.isLoading}
          hint={`${kpis?.globali.aziende ?? 0} aziende monitorate`}
        />
      </section>

      <section className="cc-charts">
        <article className="cc-chart-panel cc-chart-panel--wide">
          <header className="cc-chart-panel__header">
            <h3>Andamento settimanale</h3>
            <p>Importazioni, analisi e offerte nel periodo selezionato</p>
          </header>
          {kpisQuery.isLoading ? (
            <div className="cc-chart-panel__loading" />
          ) : (
            <MultiBarChart
              series={[
                {
                  label: "Importate",
                  data: kpis?.serie_temporale.gare_importate ?? [],
                  color: "#3b82f6",
                },
                {
                  label: "Analizzate",
                  data: kpis?.serie_temporale.gare_analizzate ?? [],
                  color: "#22c55e",
                },
                {
                  label: "Offerte",
                  data: kpis?.serie_temporale.offerte_in_corso ?? [],
                  color: "#a78bfa",
                },
              ]}
            />
          )}
        </article>

        <article className="cc-chart-panel">
          <header className="cc-chart-panel__header">
            <h3>Distribuzione per fase</h3>
          </header>
          {kpisQuery.isLoading ? (
            <div className="cc-chart-panel__loading" />
          ) : (
            <DonutChart segments={faseSegments} />
          )}
        </article>

        <article className="cc-chart-panel">
          <header className="cc-chart-panel__header">
            <h3>Distribuzione per fonte</h3>
          </header>
          {kpisQuery.isLoading ? (
            <div className="cc-chart-panel__loading" />
          ) : (
            <DonutChart segments={sourceSegments} />
          )}
        </article>

        <article className="cc-chart-panel">
          <header className="cc-chart-panel__header">
            <h3>Scadenze gare (settimana)</h3>
          </header>
          {kpisQuery.isLoading ? (
            <div className="cc-chart-panel__loading" />
          ) : (
            <BarChart
              data={kpis?.serie_temporale.scadenze_gare ?? []}
              color="#f59e0b"
              label="Gare in scadenza per settimana"
            />
          )}
        </article>
      </section>

      <div className="cc-grid cc-grid--3">
        <GareOggiPanel kpis={kpis} loading={kpisQuery.isLoading} />
        <ScoutingPanel kpis={kpis} loading={kpisQuery.isLoading} />
        <OffertePanel kpis={kpis} loading={kpisQuery.isLoading} />
        <CompatibilitaPanel kpis={kpis} loading={kpisQuery.isLoading} />
        <DocumentiPanel kpis={kpis} loading={kpisQuery.isLoading} docDays={filters.doc_days} />
      </div>
    </div>
  );
}

function DashboardFiltersBar({
  filters,
  onChange,
  loading,
}: {
  filters: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
  loading: boolean;
}) {
  return (
    <section className="cc-filters" aria-label="Filtri dashboard">
      <div className="cc-filters__group">
        <label htmlFor="filter-period">Periodo</label>
        <select
          id="filter-period"
          value={filters.period}
          onChange={(e) => onChange({ ...filters, period: e.target.value as DashboardPeriod })}
        >
          <option value="7d">Ultimi 7 giorni</option>
          <option value="30d">Ultimi 30 giorni</option>
          <option value="90d">Ultimi 90 giorni</option>
          <option value="365d">Ultimo anno</option>
          <option value="all">Tutto</option>
        </select>
      </div>

      <div className="cc-filters__group">
        <label htmlFor="filter-source">Fonte</label>
        <select
          id="filter-source"
          value={filters.source}
          onChange={(e) => onChange({ ...filters, source: e.target.value as TenderSource | "" })}
        >
          <option value="">Tutte le fonti</option>
          <option value="manual">Manuale</option>
          <option value="scouting">Scouting</option>
          <option value="telemat">Telemat</option>
        </select>
      </div>

      <div className="cc-filters__group">
        <label htmlFor="filter-fase">Fase</label>
        <select
          id="filter-fase"
          value={filters.fase}
          onChange={(e) => onChange({ ...filters, fase: e.target.value as TenderFase | "" })}
        >
          <option value="">Tutte le fasi</option>
          <option value="da_analizzare">Da analizzare</option>
          <option value="in_corso">In corso</option>
          <option value="partecipabile">Partecipabile</option>
          <option value="esclusa">Esclusa</option>
          <option value="offerta">Offerta</option>
        </select>
      </div>

      <div className="cc-filters__group">
        <label htmlFor="filter-doc-days">Scadenza documenti</label>
        <select
          id="filter-doc-days"
          value={filters.doc_days}
          onChange={(e) => onChange({ ...filters, doc_days: Number(e.target.value) })}
        >
          <option value={7}>Entro 7 giorni</option>
          <option value={30}>Entro 30 giorni</option>
          <option value={60}>Entro 60 giorni</option>
          <option value={90}>Entro 90 giorni</option>
        </select>
      </div>

      {loading && <span className="cc-filters__status">Aggiornamento…</span>}
    </section>
  );
}

function MetricTile({
  label,
  value,
  loading,
  accent = "default",
  urgent = false,
  linkTo,
}: {
  label: string;
  value?: number;
  loading: boolean;
  accent?: "default" | "blue" | "amber" | "violet" | "green" | "red";
  urgent?: boolean;
  linkTo?: string;
}) {
  const content = (
    <>
      <span className="cc-metric__label">{label}</span>
      <strong className="cc-metric__value">{loading ? "—" : (value ?? 0)}</strong>
    </>
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className={`cc-metric cc-metric--${accent} ${urgent ? "cc-metric--urgent" : ""} cc-metric--link`}
      >
        {content}
      </Link>
    );
  }

  return (
    <article className={`cc-metric cc-metric--${accent} ${urgent ? "cc-metric--urgent" : ""}`}>
      {content}
    </article>
  );
}

function GlobalKpiCard({
  label,
  value,
  loading,
  hint,
}: {
  label: string;
  value: string;
  loading: boolean;
  hint?: string;
}) {
  return (
    <article className="cc-global-card">
      <span className="cc-global-card__label">{label}</span>
      <strong className="cc-global-card__value">{loading ? "—" : value}</strong>
      {hint && <span className="cc-global-card__hint">{hint}</span>}
    </article>
  );
}

function GareOggiPanel({ kpis, loading }: { kpis?: DashboardKPIs; loading: boolean }) {
  if (loading) return <PanelSkeleton />;

  return (
    <section className="cc-panel cc-panel--gare">
      <header className="cc-panel__header">
        <div>
          <span className="cc-panel__icon">📅</span>
          <h3>Gare oggi</h3>
        </div>
        <div className="cc-panel__meta">
          <span className="cc-tag cc-tag--amber">{kpis?.gare.scadenza_oggi ?? 0} in scadenza</span>
          <span className="cc-tag">{kpis?.gare.scadenza_settimana ?? 0} entro 7 gg</span>
        </div>
      </header>

      <div className="cc-panel__body">
        {!kpis?.gare.oggi.length ? (
          <EmptyState message="Nessuna gara in scadenza oggi." linkTo="/tenders" linkLabel="Vedi tutte le gare" />
        ) : (
          <ul className="cc-list">
            {kpis.gare.oggi.map((t) => (
              <li key={t.id} className="cc-list__item cc-list__item--urgent">
                <Link to={`/tenders/${t.id}`} className="cc-list__main">
                  <strong>{t.cig}</strong>
                  <span className="cc-list__subtitle">{t.oggetto || "Senza oggetto"}</span>
                </Link>
                <div className="cc-list__side">
                  <span className="cc-list__amount">{formatImporto(t.importo)}</span>
                  <span className="cc-list__date">Oggi</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="cc-panel__footer">
        <Link to="/tenders">Tutte le gare →</Link>
        <span>
          {kpis?.gare.aperte ?? 0} aperte su {kpis?.gare.total ?? 0}
        </span>
      </footer>
    </section>
  );
}

function ScoutingPanel({ kpis, loading }: { kpis?: DashboardKPIs; loading: boolean }) {
  if (loading) return <PanelSkeleton />;

  return (
    <section className="cc-panel cc-panel--scouting">
      <header className="cc-panel__header">
        <div>
          <span className="cc-panel__icon">🔭</span>
          <h3>Scouting opportunità</h3>
        </div>
        <div className="cc-panel__meta">
          <span className="cc-tag cc-tag--green">{kpis?.scouting.alta ?? 0} alta</span>
          <span className="cc-tag cc-tag--amber">{kpis?.scouting.media ?? 0} media</span>
          <span className="cc-tag">{kpis?.scouting.bassa ?? 0} bassa</span>
        </div>
      </header>

      <div className="cc-panel__body">
        {!kpis?.scouting.opportunita.length ? (
          <EmptyState
            message="Nessuna opportunità scouting in evidenza."
            linkTo="/scouting"
            linkLabel="Vai allo scouting"
          />
        ) : (
          <ul className="cc-list">
            {kpis.scouting.opportunita.map((t) => (
              <li key={t.id} className="cc-list__item">
                <Link to={`/tenders/${t.id}`} className="cc-list__main">
                  <strong>{t.cig}</strong>
                  <span className="cc-list__subtitle">{t.oggetto || "Senza oggetto"}</span>
                </Link>
                <div className="cc-list__side">
                  <PriorityBadge priorita={t.priorita} score={t.priority_score} />
                  <span className="cc-list__date">{formatScadenza(t.scadenza)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="cc-panel__footer">
        <Link to="/scouting">Dashboard scouting →</Link>
        <span>{kpis?.scouting.total ?? 0} gare scouting</span>
      </footer>
    </section>
  );
}

function OffertePanel({ kpis, loading }: { kpis?: DashboardKPIs; loading: boolean }) {
  if (loading) return <PanelSkeleton />;

  return (
    <section className="cc-panel cc-panel--offerte">
      <header className="cc-panel__header">
        <div>
          <span className="cc-panel__icon">📝</span>
          <h3>Offerte in corso</h3>
        </div>
        <div className="cc-panel__meta">
          <span className="cc-tag cc-tag--violet">{kpis?.offerte.fase_offerta ?? 0} fase offerta</span>
          <span className="cc-tag">{kpis?.offerte.presentate ?? 0} presentate</span>
        </div>
      </header>

      <div className="cc-panel__body">
        {!kpis?.offerte.items.length ? (
          <EmptyState
            message="Nessuna offerta in preparazione."
            linkTo="/tenders/board"
            linkLabel="Apri board gare"
          />
        ) : (
          <ul className="cc-list">
            {kpis.offerte.items.map((item) => (
              <li key={`${item.tender_id}-${item.tipo}`} className="cc-list__item">
                <Link to={`/tenders/${item.tender_id}`} className="cc-list__main">
                  <strong>{item.cig}</strong>
                  <span className="cc-list__subtitle">
                    {item.company_name ?? "Azienda non assegnata"}
                    {item.sections_count > 0 && ` · ${item.sections_count} sezioni`}
                  </span>
                </Link>
                <div className="cc-list__side">
                  <span className={`cc-badge cc-badge--${item.tipo === "fase_offerta" ? "offerta" : "relazione"}`}>
                    {item.tipo === "fase_offerta" ? "Offerta" : "Relazione"}
                  </span>
                  <span className="cc-list__date">{formatScadenza(item.scadenza)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="cc-panel__footer">
        <Link to="/technical-offers">Libreria offerte →</Link>
        <span>{kpis?.offerte.libreria ?? 0} template disponibili</span>
      </footer>
    </section>
  );
}

function CompatibilitaPanel({ kpis, loading }: { kpis?: DashboardKPIs; loading: boolean }) {
  if (loading) return <PanelSkeleton />;

  const sem = kpis?.compatibilita.semaforo;

  return (
    <section className="cc-panel cc-panel--compat">
      <header className="cc-panel__header">
        <div>
          <span className="cc-panel__icon">🎯</span>
          <h3>Compatibilità aziende</h3>
        </div>
        <div className="cc-panel__meta">
          <span className="cc-tag cc-tag--green">{sem?.verde ?? 0} verde</span>
          <span className="cc-tag cc-tag--amber">{sem?.giallo ?? 0} giallo</span>
          <span className="cc-tag cc-tag--red">{sem?.rosso ?? 0} rosso</span>
        </div>
      </header>

      <div className="cc-semaforo-bar">
        <div
          className="cc-semaforo-bar__segment cc-semaforo-bar__segment--verde"
          style={{ flex: sem?.verde || 0 }}
        />
        <div
          className="cc-semaforo-bar__segment cc-semaforo-bar__segment--giallo"
          style={{ flex: sem?.giallo || 0 }}
        />
        <div
          className="cc-semaforo-bar__segment cc-semaforo-bar__segment--rosso"
          style={{ flex: sem?.rosso || 0 }}
        />
      </div>

      <div className="cc-panel__body">
        {!kpis?.compatibilita.migliori_match.length ? (
          <EmptyState
            message="Nessuna valutazione compatibilità ancora."
            linkTo="/companies"
            linkLabel="Gestisci aziende"
          />
        ) : (
          <ul className="cc-list">
            {kpis.compatibilita.migliori_match.map((m) => (
              <li key={`${m.tender_id}-${m.company_id}`} className="cc-list__item">
                <Link to={`/tenders/${m.tender_id}`} className="cc-list__main">
                  <strong>{m.cig}</strong>
                  <span className="cc-list__subtitle">{m.company_name}</span>
                </Link>
                <div className="cc-list__side">
                  <span className="cc-badge cc-badge--verde">Verde</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="cc-panel__footer">
        <Link to="/companies">Aziende →</Link>
        <span>
          {kpis?.compatibilita.gare_con_verde ?? 0} gare con match · {kpis?.compatibilita.aziende ?? 0} aziende
        </span>
      </footer>
    </section>
  );
}

function DocumentiPanel({
  kpis,
  loading,
  docDays,
}: {
  kpis?: DashboardKPIs;
  loading: boolean;
  docDays: number;
}) {
  if (loading) return <PanelSkeleton />;

  return (
    <section className="cc-panel cc-panel--docs">
      <header className="cc-panel__header">
        <div>
          <span className="cc-panel__icon">📄</span>
          <h3>Documenti in scadenza</h3>
        </div>
        <div className="cc-panel__meta">
          <span className="cc-tag cc-tag--red">{kpis?.documenti.in_scadenza ?? 0} entro {docDays} gg</span>
        </div>
      </header>

      <div className="cc-panel__body">
        {!kpis?.documenti.items.length ? (
          <EmptyState
            message="Nessun documento aziendale in scadenza nel periodo selezionato."
            linkTo="/companies"
            linkLabel="Gestisci documenti"
          />
        ) : (
          <ul className="cc-list">
            {kpis.documenti.items.map((doc) => (
              <li key={doc.id} className="cc-list__item cc-list__item--urgent">
                <Link to={`/companies/${doc.company_id}`} className="cc-list__main">
                  <strong>{doc.original_filename}</strong>
                  <span className="cc-list__subtitle">
                    {doc.company_name} · {doc.categoria_label}
                  </span>
                </Link>
                <div className="cc-list__side">
                  <span
                    className={`cc-badge ${doc.giorni_alla_scadenza !== null && doc.giorni_alla_scadenza < 0 ? "cc-badge--rosso" : "cc-badge--amber"}`}
                  >
                    {doc.giorni_alla_scadenza !== null && doc.giorni_alla_scadenza < 0
                      ? "Scaduto"
                      : `${doc.giorni_alla_scadenza ?? 0} gg`}
                  </span>
                  {doc.data_scadenza && (
                    <span className="cc-list__date">{formatScadenza(doc.data_scadenza)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="cc-panel__footer">
        <Link to="/companies">Tutte le aziende →</Link>
        <span>{kpis?.documenti.in_scadenza ?? 0} documenti da rinnovare</span>
      </footer>
    </section>
  );
}
