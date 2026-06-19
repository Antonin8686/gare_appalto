import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchCompanies } from "../api/companies";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { useTableSort } from "../hooks/useTableSort";
import type { Company } from "../types/company";
import { compareNumbers, compareStrings, sortRows } from "../utils/tableSort";
import "./CompaniesList.css";

type SortColumn = "name" | "fatturato" | "ccnl" | "certificazioni" | "servizi";

const TABLE_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: "name", label: "Ragione sociale" },
  { id: "fatturato", label: "Fatturato" },
  { id: "ccnl", label: "CCNL" },
  { id: "certificazioni", label: "Certificazioni" },
  { id: "servizi", label: "Servizi" },
];

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

function compareCompanies(a: Company, b: Company, column: SortColumn): number {
  switch (column) {
    case "name":
      return compareStrings(a.name, b.name);
    case "fatturato":
      return compareNumbers(Number(a.fatturato) || 0, Number(b.fatturato) || 0);
    case "ccnl":
      return compareStrings(a.ccnl || "", b.ccnl || "");
    case "certificazioni":
      return compareNumbers(a.certificazioni.length, b.certificazioni.length);
    case "servizi":
      return compareNumbers(a.servizi.length, b.servizi.length);
  }
}

export function CompaniesListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });

  const { sortColumn, sortDirection, handleSort } = useTableSort<SortColumn>(
    "name",
    "asc",
    ["fatturato", "certificazioni", "servizi"],
  );

  const sortedCompanies = useMemo(() => {
    if (!data) return [];
    return sortRows(data, sortColumn, sortDirection, compareCompanies, (a, b) =>
      compareStrings(a.name, b.name),
    );
  }, [data, sortColumn, sortDirection]);

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

      {sortedCompanies.length > 0 && (
        <section className="companies-table-card">
          <table className="companies-table">
            <thead>
              <tr>
                {TABLE_COLUMNS.map(({ id, label }) => (
                  <SortableTableHeader
                    key={id}
                    column={id}
                    label={label}
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                ))}
                <th aria-sort="none" />
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.map((company) => (
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
