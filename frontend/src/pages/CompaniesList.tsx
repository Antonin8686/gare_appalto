import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchCompanies } from "../api/companies";
import "./CompaniesList.css";

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

export function CompaniesListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });

  return (
    <div className="companies">
      <header className="companies-header">
        <div>
          <h2>Le tue aziende</h2>
          <p>Gestisci le aziende associate al tuo account.</p>
        </div>
        <Link to="/companies/new" className="companies-new-btn">
          Nuova azienda
        </Link>
      </header>

      {isLoading && <p className="companies-loading">Caricamento...</p>}

      {isError && (
        <p className="companies-error">
          Errore: {error instanceof Error ? error.message : "impossibile caricare le aziende"}
        </p>
      )}

      {data && data.length === 0 && (
        <section className="companies-empty">
          <p>Non hai ancora registrato nessuna azienda.</p>
          <Link to="/companies/new">Crea la prima azienda</Link>
        </section>
      )}

      {data && data.length > 0 && (
        <section className="companies-table-card">
          <table className="companies-table">
            <thead>
              <tr>
                <th>Ragione sociale</th>
                <th>Fatturato</th>
                <th>CCNL</th>
                <th>Certificazioni</th>
                <th>Servizi</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((company) => (
                <tr key={company.id}>
                  <td>
                    <Link to={`/companies/${company.id}`} className="companies-link">
                      {company.name}
                    </Link>
                  </td>
                  <td>{formatFatturato(company.fatturato)}</td>
                  <td>{company.ccnl || "—"}</td>
                  <td>{company.certificazioni.length || "—"}</td>
                  <td>{company.servizi.length || "—"}</td>
                  <td>
                    <Link to={`/companies/${company.id}/edit`} className="companies-edit-link">
                      Modifica
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
