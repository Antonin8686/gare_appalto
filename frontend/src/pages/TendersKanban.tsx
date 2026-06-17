import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchTenders } from "../api/tenders";
import { TenderKanbanBoard } from "../components/TenderKanbanBoard";
import "./TendersKanban.css";

export function TendersKanbanPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tenders"],
    queryFn: fetchTenders,
  });

  return (
    <div className="tenders-kanban">
      <header className="tenders-kanban__header">
        <div>
          <h2>Board gare</h2>
          <p>Trascina le gare tra le colonne per aggiornare lo stato di lavorazione.</p>
        </div>
        <div className="tenders-kanban__actions">
          <Link to="/tenders" className="tenders-kanban__link">
            Vista elenco
          </Link>
          <Link to="/tenders/new" className="tenders-kanban__new-btn">
            Nuova gara
          </Link>
        </div>
      </header>

      {isLoading && <p className="tenders-kanban__loading">Caricamento...</p>}

      {isError && (
        <p className="tenders-kanban__error">
          Errore: {error instanceof Error ? error.message : "impossibile caricare le gare"}
        </p>
      )}

      {data && data.length === 0 && (
        <section className="tenders-kanban__empty">
          <p>Non hai ancora registrato nessuna gara.</p>
          <Link to="/tenders/new">Crea la prima gara</Link>
        </section>
      )}

      {data && data.length > 0 && <TenderKanbanBoard tenders={data} />}
    </div>
  );
}
