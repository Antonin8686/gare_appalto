import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchCompanies } from "../api/companies";
import {
  autoGenerateOffers,
  fetchEconomicRelation,
  generateEconomicRelationOutline,
  patchEconomicRelation,
  validateEconomicRelation,
} from "../api/tenderEconomicRelation";
import type {
  EconomicRelationLineItem,
  EconomicRelationValidationResult,
} from "../types/tenderEconomicRelation";
import {
  PRICING_MODEL_LABELS,
  lineItemsSaveFingerprint,
  sortLineItemsByOrder,
} from "../types/tenderEconomicRelation";
import "./TenderEconomicOffer.css";

const AUTOSAVE_DELAY_MS = 1000;

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface TenderEconomicOfferProps {
  tenderId: number;
}

function computeImporto(quantita: string, prezzoUnitario: string): string {
  const q = Number(String(quantita).replace(",", "."));
  const p = Number(String(prezzoUnitario).replace(",", "."));
  if (!Number.isFinite(q) || !Number.isFinite(p)) return "";
  return (q * p).toFixed(2);
}

export function TenderEconomicOffer({ tenderId }: TenderEconomicOfferProps) {
  const queryClient = useQueryClient();
  const [draftItems, setDraftItems] = useState<EconomicRelationLineItem[]>([]);
  const [companyId, setCompanyId] = useState<number | "">("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [validation, setValidation] = useState<EconomicRelationValidationResult | null>(null);

  const savedFingerprintRef = useRef<string>("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: relation, isLoading, isError } = useQuery({
    queryKey: ["tenders", tenderId, "economic-relation"],
    queryFn: () => fetchEconomicRelation(tenderId),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });

  useEffect(() => {
    if (!relation) return;
    setDraftItems(sortLineItemsByOrder(relation.line_items));
    setCompanyId(relation.company_id ?? "");
    savedFingerprintRef.current = lineItemsSaveFingerprint(
      relation.line_items,
      relation.company_id,
    );
  }, [relation]);

  const saveMutation = useMutation({
    mutationFn: (payload: { line_items: EconomicRelationLineItem[]; company_id?: number | null }) =>
      patchEconomicRelation(tenderId, payload),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: (data) => {
      queryClient.setQueryData(["tenders", tenderId, "economic-relation"], data);
      savedFingerprintRef.current = lineItemsSaveFingerprint(data.line_items, data.company_id);
      setSaveStatus("saved");
    },
    onError: () => setSaveStatus("error"),
  });

  const outlineMutation = useMutation({
    mutationFn: () =>
      generateEconomicRelationOutline(tenderId, {
        company_id: companyId === "" ? null : companyId,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["tenders", tenderId, "economic-relation"], data);
      setDraftItems(sortLineItemsByOrder(data.line_items));
    },
  });

  const autoGenerateMutation = useMutation({
    mutationFn: (force: boolean) => autoGenerateOffers(tenderId, force),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["tenders", tenderId, "economic-relation"],
        data.economic_relation,
      );
      queryClient.invalidateQueries({ queryKey: ["tenders", tenderId, "technical-relation"] });
      setDraftItems(sortLineItemsByOrder(data.economic_relation.line_items));
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => validateEconomicRelation(tenderId, draftItems),
    onSuccess: setValidation,
  });

  useEffect(() => {
    if (!relation) return;
    const fingerprint = lineItemsSaveFingerprint(
      draftItems,
      companyId === "" ? null : companyId,
    );
    if (fingerprint === savedFingerprintRef.current) return;

    setSaveStatus("pending");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveMutation.mutate({
        line_items: draftItems,
        company_id: companyId === "" ? null : companyId,
      });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [draftItems, companyId, relation, saveMutation]);

  function updateItem(itemId: string, patch: Partial<EconomicRelationLineItem>) {
    setDraftItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const next = { ...item, ...patch };
        if ("quantita" in patch || "prezzo_unitario" in patch) {
          next.importo = computeImporto(next.quantita, next.prezzo_unitario);
        }
        next.completed = Boolean(next.importo || next.ribasso_percentuale);
        return next;
      }),
    );
  }

  if (isLoading) {
    return <p className="tender-economic-offer-loading">Caricamento offerta economica...</p>;
  }

  if (isError || !relation) {
    return <p className="tender-economic-offer-error">Impossibile caricare l&apos;offerta economica.</p>;
  }

  const outline = relation.outline;
  const pricingLabel = PRICING_MODEL_LABELS[outline.pricing_model] ?? outline.pricing_model;

  return (
    <section className="tender-economic-offer">
      <div className="tender-economic-offer-header">
        <div>
          <h3>Offerta economica</h3>
          <div className="tender-economic-offer-summary">
            <span className="tender-economic-offer-badge">{pricingLabel}</span>
            {outline.importo_base && (
              <span className="tender-economic-offer-badge">
                Importo base € {outline.importo_base}
              </span>
            )}
            {relation.auto_generated && (
              <span className="tender-economic-offer-badge tender-economic-offer-badge--auto">
                Generata automaticamente
              </span>
            )}
            {outline.source_summary && (
              <span className="tender-economic-offer-badge">{outline.source_summary}</span>
            )}
          </div>
        </div>

        <div className="tender-economic-offer-actions">
          <label>
            Azienda{" "}
            <select
              value={companyId}
              onChange={(event) =>
                setCompanyId(event.target.value === "" ? "" : Number(event.target.value))
              }
            >
              <option value="">—</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => autoGenerateMutation.mutate(false)}
            disabled={autoGenerateMutation.isPending}
          >
            {autoGenerateMutation.isPending ? "Generazione..." : "Genera offerte da documenti"}
          </button>
          <button
            type="button"
            onClick={() => outlineMutation.mutate()}
            disabled={outlineMutation.isPending}
          >
            Rigenera voci
          </button>
          <button
            type="button"
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
          >
            Valida
          </button>
          <span>
            {saveStatus === "saving" && "Salvataggio..."}
            {saveStatus === "saved" && "Salvato"}
            {saveStatus === "error" && "Errore salvataggio"}
          </span>
        </div>
      </div>

      <div className="tender-economic-offer-table-wrap">
        <table className="tender-economic-offer-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Voce</th>
              <th>U.M.</th>
              <th>Quantità</th>
              <th>Prezzo unit.</th>
              <th>Importo</th>
              <th>Ribasso %</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {draftItems.map((item) => (
              <tr key={item.id}>
                <td>{item.order}</td>
                <td>
                  <textarea
                    value={item.voce}
                    rows={2}
                    onChange={(event) => updateItem(item.id, { voce: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={item.unita_misura}
                    onChange={(event) =>
                      updateItem(item.id, { unita_misura: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    value={item.quantita}
                    onChange={(event) => updateItem(item.id, { quantita: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={item.prezzo_unitario}
                    onChange={(event) =>
                      updateItem(item.id, { prezzo_unitario: event.target.value })
                    }
                  />
                </td>
                <td>{item.importo || "—"}</td>
                <td>
                  <input
                    value={item.ribasso_percentuale}
                    onChange={(event) =>
                      updateItem(item.id, { ribasso_percentuale: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    value={item.notes}
                    onChange={(event) => updateItem(item.id, { notes: event.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tender-economic-offer-totals">
        <div className="tender-economic-offer-total-card">
          <strong>Imponibile</strong>
          {outline.totals.imponibile || "—"}
        </div>
        <div className="tender-economic-offer-total-card">
          <strong>IVA</strong>
          {outline.totals.iva || "—"}
        </div>
        <div className="tender-economic-offer-total-card">
          <strong>Totale</strong>
          {outline.totals.totale || "—"}
        </div>
      </div>

      {validation && validation.issues.length > 0 && (
        <div className="tender-economic-offer-validation">
          <strong>
            {validation.valid
              ? "Validazione completata con avvisi"
              : "Problemi rilevati nell'offerta economica"}
          </strong>
          <ul>
            {validation.issues.map((issue) => (
              <li key={`${issue.code}-${issue.line_item_id}-${issue.message}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
