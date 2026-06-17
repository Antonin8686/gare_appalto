import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteCompany, fetchCompany } from "../api/companies";
import { CompanyCorporateDataView } from "../components/CompanyCorporateDataView";
import { CompanyDocuments } from "../components/CompanyDocuments";
import { FORMA_GIURIDICA_LABELS } from "../types/company";
import "../components/CompanyCorporateDataView.css";
import "./CompanyDetail.css";

type CompanyTab = "profilo" | "societari" | "documenti";

function formatFatturato(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatImporto(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatScadenza(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function totalDipendenti(dipendenti: { numero: number }[]): number {
  return dipendenti.reduce((sum, d) => sum + d.numero, 0);
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const companyId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CompanyTab>("profilo");

  const { data: company, isLoading, isError, error } = useQuery({
    queryKey: ["companies", companyId],
    queryFn: () => fetchCompany(companyId!),
    enabled: companyId !== null && !Number.isNaN(companyId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCompany(companyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      navigate("/companies");
    },
  });

  function handleDelete() {
    if (window.confirm("Sei sicuro di voler eliminare questa azienda?")) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return <p className="company-detail-loading">Caricamento...</p>;
  }

  if (isError || !company) {
    return (
      <p className="company-detail-error">
        Errore: {error instanceof Error ? error.message : "azienda non trovata"}
      </p>
    );
  }

  const totDipendenti = totalDipendenti(company.dipendenti);

  return (
    <div className="company-detail">
      <header className="company-detail-header">
        <div>
          <Link to="/companies" className="company-detail-back">
            ← Torna alle aziende
          </Link>
          <h2>{company.name}</h2>
          <p>
            {company.partita_iva && `P.IVA ${company.partita_iva}`}
            {company.partita_iva && company.forma_giuridica && " · "}
            {company.forma_giuridica &&
              FORMA_GIURIDICA_LABELS[company.forma_giuridica]}
          </p>
        </div>
        <div className="company-detail-actions">
          <Link to={`/companies/${company.id}/edit`} className="company-detail-edit">
            Modifica
          </Link>
          <button
            type="button"
            className="company-detail-delete"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
          </button>
        </div>
      </header>

      <nav className="company-detail-tabs" aria-label="Sezioni azienda">
        <button
          type="button"
          className={`company-detail-tab${activeTab === "profilo" ? " company-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("profilo")}
        >
          Profilo operativo
        </button>
        <button
          type="button"
          className={`company-detail-tab${activeTab === "societari" ? " company-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("societari")}
        >
          Dati societari
        </button>
        <button
          type="button"
          className={`company-detail-tab${activeTab === "documenti" ? " company-detail-tab--active" : ""}`}
          onClick={() => setActiveTab("documenti")}
        >
          Documenti aziendali
        </button>
      </nav>

      {activeTab === "documenti" ? (
        <CompanyDocuments companyId={company.id} />
      ) : activeTab === "societari" ? (
        <CompanyCorporateDataView company={company} />
      ) : (
        <>
          <section className="company-detail-card">
            <h3 className="company-detail-section-title">Dati generali</h3>
            <dl className="company-detail-fields">
              <div>
                <dt>Fatturato annuo</dt>
                <dd>{formatFatturato(company.fatturato)}</dd>
              </div>
              <div>
                <dt>CCNL applicato</dt>
                <dd>{company.ccnl || "—"}</dd>
              </div>
            </dl>
          </section>

          {company.dipendenti.length > 0 && (
            <section className="company-detail-card">
              <h3 className="company-detail-section-title">
                Dipendenti
                {totDipendenti > 0 && (
                  <span className="company-detail-badge">{totDipendenti} totali</span>
                )}
              </h3>
              <table className="company-detail-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Numero</th>
                  </tr>
                </thead>
                <tbody>
                  {company.dipendenti.map((d) => (
                    <tr key={d.categoria}>
                      <td>{d.categoria}</td>
                      <td>{d.numero}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="company-detail-card">
            <h3 className="company-detail-section-title">Certificazioni</h3>
            {company.certificazioni.length > 0 ? (
              <table className="company-detail-table">
                <thead>
                  <tr>
                    <th>Certificazione</th>
                    <th>Ente</th>
                    <th>Scadenza</th>
                  </tr>
                </thead>
                <tbody>
                  {company.certificazioni.map((cert) => (
                    <tr key={`${cert.nome}-${cert.ente}`}>
                      <td>{cert.nome}</td>
                      <td>{cert.ente || "—"}</td>
                      <td>{formatScadenza(cert.scadenza)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="company-detail-empty">Nessuna certificazione inserita.</p>
            )}
          </section>

          {company.esperienze.length > 0 && (
            <section className="company-detail-card">
              <h3 className="company-detail-section-title">Esperienze pregresse</h3>
              <div className="company-detail-experiences">
                {company.esperienze.map((esp) => (
                  <article key={`${esp.titolo}-${esp.anno}`} className="company-detail-experience">
                    <h4>{esp.titolo}</h4>
                    <dl>
                      {esp.committente && (
                        <div>
                          <dt>Committente</dt>
                          <dd>{esp.committente}</dd>
                        </div>
                      )}
                      {esp.anno && (
                        <div>
                          <dt>Anno</dt>
                          <dd>{esp.anno}</dd>
                        </div>
                      )}
                      {esp.importo && (
                        <div>
                          <dt>Importo</dt>
                          <dd>{formatImporto(esp.importo)}</dd>
                        </div>
                      )}
                      {esp.descrizione && (
                        <div>
                          <dt>Descrizione</dt>
                          <dd>{esp.descrizione}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="company-detail-card">
            <h3 className="company-detail-section-title">Servizi</h3>
            {company.servizi.length > 0 ? (
              <ul className="company-detail-list">
                {company.servizi.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="company-detail-empty">Nessun servizio inserito.</p>
            )}
          </section>
        </>
      )}

      <section className="company-detail-card company-detail-meta">
        <dl className="company-detail-fields">
          <div>
            <dt>Creata il</dt>
            <dd>{formatDate(company.created_at)}</dd>
          </div>
          <div>
            <dt>Ultimo aggiornamento</dt>
            <dd>{formatDate(company.updated_at)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
