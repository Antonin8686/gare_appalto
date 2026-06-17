import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTender, fetchTender, updateTender } from "../api/tenders";
import type { TenderPayload, TenderStato } from "../types/tender";
import { TENDER_STATI } from "../types/tender";
import { fieldValidation, validateForm } from "../utils/formValidation";
import "./TenderForm.css";

export function TenderFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const tenderId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    cig: "",
    cpv: "",
    importo: "",
    scadenza: "",
    stato: "bozza" as TenderStato,
  });
  const [error, setError] = useState<string | null>(null);

  const { data: tender, isLoading } = useQuery({
    queryKey: ["tenders", tenderId],
    queryFn: () => fetchTender(tenderId!),
    enabled: isEdit && tenderId !== null && !Number.isNaN(tenderId),
  });

  useEffect(() => {
    if (tender) {
      setForm({
        cig: tender.cig,
        cpv: tender.cpv,
        importo: tender.importo,
        scadenza: tender.scadenza,
        stato: tender.stato,
      });
    }
  }, [tender]);

  const mutation = useMutation({
    mutationFn: (payload: TenderPayload) =>
      isEdit && tenderId ? updateTender(tenderId, payload) : createTender(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      navigate(`/tenders/${saved.id}`);
    },
    onError: () => {
      setError("Salvataggio non riuscito. Verifica i dati inseriti.");
    },
  });

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) {
      return;
    }
    setError(null);

    const payload: TenderPayload = {
      cig: form.cig.trim().toUpperCase(),
      cpv: form.cpv.trim(),
      importo: form.importo.trim(),
      scadenza: form.scadenza,
      stato: form.stato,
    };

    mutation.mutate(payload);
  }

  if (isEdit && isLoading) {
    return <p className="tender-form-loading">Caricamento...</p>;
  }

  return (
    <div className="tender-form-page">
      <header className="tender-form-header">
        <h2>{isEdit ? "Modifica gara" : "Nuova gara"}</h2>
        <p>
          {isEdit ? "Aggiorna i dati della gara." : "Inserisci i dati della nuova gara d'appalto."}
        </p>
      </header>

      <form className="tender-form-card" onSubmit={handleSubmit} noValidate>
        <label htmlFor="cig">CIG</label>
        <input
          id="cig"
          type="text"
          value={form.cig}
          onChange={(e) => updateField("cig", e.target.value)}
          maxLength={10}
          placeholder="Es. Z123456789"
          required
          {...fieldValidation({
            required: "Inserisci il codice CIG della gara",
          })}
        />

        <label htmlFor="cpv">CPV</label>
        <input
          id="cpv"
          type="text"
          value={form.cpv}
          onChange={(e) => updateField("cpv", e.target.value)}
          maxLength={8}
          placeholder="Es. 45233140"
          required
          {...fieldValidation({
            required: "Inserisci il codice CPV del bando",
          })}
        />

        <label htmlFor="importo">Importo (€)</label>
        <input
          id="importo"
          type="number"
          min="0"
          step="0.01"
          value={form.importo}
          onChange={(e) => updateField("importo", e.target.value)}
          placeholder="Es. 250000"
          required
          {...fieldValidation({
            required: "Indica l'importo complessivo della gara",
          })}
        />

        <label htmlFor="scadenza">Scadenza</label>
        <input
          id="scadenza"
          type="date"
          value={form.scadenza}
          onChange={(e) => updateField("scadenza", e.target.value)}
          required
          {...fieldValidation({
            required: "Seleziona la data di scadenza della gara",
          })}
        />

        <label htmlFor="stato">Stato</label>
        <select
          id="stato"
          value={form.stato}
          onChange={(e) => updateField("stato", e.target.value as TenderStato)}
        >
          {TENDER_STATI.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error && <p className="tender-form-error">{error}</p>}

        <div className="tender-form-actions">
          <Link to={isEdit && tenderId ? `/tenders/${tenderId}` : "/tenders"}>Annulla</Link>
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Crea gara"}
          </button>
        </div>
      </form>
    </div>
  );
}
