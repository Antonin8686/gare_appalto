import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCompany, fetchCompany, updateCompany } from "../api/companies";
import { CompanyCorporateFormSection } from "../components/CompanyCorporateFormSection";
import type {
  Certificazione,
  CompanyCorporateData,
  CompanyPayload,
  DipendenteCategoria,
  Esperienza,
} from "../types/company";
import {
  corporateDataFromCompany,
  emptyCertificazione,
  emptyCorporateData,
  emptyDipendente,
  emptyEsperienza,
  normalizeEsperienze,
} from "../types/company";
import { formatApiError } from "../utils/apiError";
import { fieldValidation, validateForm } from "../utils/formValidation";
import {
  isValidCodiceFiscale,
  isValidIban,
  isValidPartitaIva,
} from "../utils/companyValidation";
import "./CompanyForm.css";

type CompanyFormTab = "generale" | "organizzazione" | "esperienze" | "societari";

const FORM_TABS: { id: CompanyFormTab; label: string }[] = [
  { id: "generale", label: "Generale" },
  { id: "organizzazione", label: "Organizzazione" },
  { id: "esperienze", label: "Esperienze" },
  { id: "societari", label: "Dati societari" },
];

function listToText(items: string[]): string {
  return items.join("\n");
}

function textToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

interface CompanyFormState {
  name: string;
  corporate: CompanyCorporateData;
  fatturato: string;
  ccnl: string;
  dipendenti: DipendenteCategoria[];
  esperienze: Esperienza[];
  certificazioni: Certificazione[];
  servizi: string;
}

const EMPTY_FORM: CompanyFormState = {
  name: "",
  corporate: emptyCorporateData(),
  fatturato: "",
  ccnl: "",
  dipendenti: [],
  esperienze: [],
  certificazioni: [],
  servizi: "",
};

function buildCorporatePayload(data: CompanyCorporateData): CompanyCorporateData {
  return {
    partita_iva: data.partita_iva.trim(),
    codice_fiscale: data.codice_fiscale.trim(),
    forma_giuridica: data.forma_giuridica,
    iscrizione_cciaa: {
      rea: data.iscrizione_cciaa.rea.trim(),
      provincia: data.iscrizione_cciaa.provincia.trim().toUpperCase(),
      data_iscrizione: data.iscrizione_cciaa.data_iscrizione,
    },
    oggetto_sociale: data.oggetto_sociale.trim(),
    codici_ateco: data.codici_ateco.filter((item) => item.codice.trim()),
    sedi_legali: data.sedi_legali.filter((item) => item.indirizzo.trim()),
    sedi_operative: data.sedi_operative.filter((item) => item.indirizzo.trim()),
    autorizzazioni: data.autorizzazioni.filter((item) => item.nome.trim()),
    licenze: data.licenze.filter((item) => item.nome.trim()),
    rating_legalita: data.rating_legalita,
    attestazioni_soa: data.attestazioni_soa.filter((item) => item.categoria.trim()),
    referenze_bancarie: data.referenze_bancarie.filter((item) => item.istituto.trim()),
    polizze_assicurative: data.polizze_assicurative.filter((item) => item.tipo.trim()),
    presenza_territoriale: data.presenza_territoriale.filter((item) => item.regione.trim()),
  };
}

export function CompanyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const companyId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CompanyFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CompanyFormTab>("generale");
  const loadedCompanyId = useRef<number | null>(null);

  const { data: company, isLoading } = useQuery({
    queryKey: ["companies", companyId],
    queryFn: () => fetchCompany(companyId!),
    enabled: isEdit && companyId !== null && !Number.isNaN(companyId),
  });

  useEffect(() => {
    if (!isEdit) {
      loadedCompanyId.current = null;
      setForm(EMPTY_FORM);
      setActiveTab("generale");
      return;
    }
    if (company && companyId !== null && loadedCompanyId.current !== companyId) {
      setForm({
        name: company.name,
        corporate: corporateDataFromCompany(company),
        fatturato: company.fatturato ?? "",
        ccnl: company.ccnl ?? "",
        dipendenti: company.dipendenti.length > 0 ? company.dipendenti : [],
        esperienze: normalizeEsperienze(company.esperienze),
        certificazioni:
          company.certificazioni.length > 0 ? company.certificazioni : [],
        servizi: listToText(company.servizi),
      });
      loadedCompanyId.current = companyId;
    }
  }, [company, companyId, isEdit]);

  const mutation = useMutation({
    mutationFn: (payload: CompanyPayload) =>
      isEdit && companyId ? updateCompany(companyId, payload) : createCompany(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.setQueryData(["companies", saved.id], saved);
      navigate(`/companies/${saved.id}`);
    },
    onError: (mutationError) => {
      setError(formatApiError(mutationError, "Salvataggio non riuscito. Verifica i dati inseriti."));
    },
  });

  function updateField<K extends keyof CompanyFormState>(
    field: K,
    value: CompanyFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateDipendente(index: number, field: keyof DipendenteCategoria, value: string) {
    setForm((prev) => ({
      ...prev,
      dipendenti: prev.dipendenti.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "numero" ? Number(value) || 0 : value,
            }
          : item,
      ),
    }));
  }

  function updateEsperienza(index: number, field: keyof Esperienza, value: string) {
    setForm((prev) => ({
      ...prev,
      esperienze: prev.esperienze.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "importo" ? value.trim() || null : value,
            }
          : item,
      ),
    }));
  }

  function updateCertificazione(
    index: number,
    field: keyof Certificazione,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      certificazioni: prev.certificazioni.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "scadenza" ? value || null : value,
            }
          : item,
      ),
    }));
  }

  function focusTabForInvalidField(formEl: HTMLFormElement) {
    const invalid = formEl.querySelector<HTMLElement>("[aria-invalid='true']");
    if (!invalid) return;
    const tab = invalid.closest<HTMLElement>("[data-form-tab]")?.dataset.formTab;
    if (tab) {
      setActiveTab(tab as CompanyFormTab);
      requestAnimationFrame(() => {
        invalid.focus();
        invalid.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const corporate = buildCorporatePayload(form.corporate);
    if (corporate.partita_iva && !isValidPartitaIva(corporate.partita_iva)) {
      setActiveTab("societari");
      setError("Partita IVA non valida.");
      return;
    }
    if (corporate.codice_fiscale && !isValidCodiceFiscale(corporate.codice_fiscale)) {
      setActiveTab("societari");
      setError("Codice fiscale non valido.");
      return;
    }
    for (const ref of corporate.referenze_bancarie) {
      if (ref.iban && !isValidIban(ref.iban)) {
        setActiveTab("societari");
        setError("Uno o più IBAN non sono validi.");
        return;
      }
    }
    if (!validateForm(event.currentTarget)) {
      focusTabForInvalidField(event.currentTarget);
      setError("Controlla i campi evidenziati in rosso prima di salvare.");
      return;
    }
    setError(null);

    const payload: CompanyPayload = {
      name: form.name.trim(),
      ...buildCorporatePayload(form.corporate),
      fatturato: form.fatturato.trim() || null,
      ccnl: form.ccnl.trim(),
      dipendenti: form.dipendenti.filter((d) => d.categoria.trim()),
      esperienze: form.esperienze.filter((e) => e.titolo.trim()),
      certificazioni: form.certificazioni.filter((c) => c.nome.trim()),
      servizi: textToList(form.servizi),
    };

    mutation.mutate(payload);
  }

  if (isEdit && isLoading) {
    return <p className="company-form-loading">Caricamento...</p>;
  }

  return (
    <div className="company-form-page">
      <header className="company-form-header">
        <h2>{isEdit ? "Modifica azienda" : "Nuova azienda"}</h2>
        <p>
          {isEdit
            ? "Aggiorna i dati dell'azienda."
            : "Inserisci i dati della nuova azienda."}
        </p>
      </header>

      <form className="company-form-card" onSubmit={handleSubmit} noValidate>
        <nav className="company-form-tabs" aria-label="Sezioni modifica azienda">
          {FORM_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`company-form-tab${activeTab === tab.id ? " company-form-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div
          className={`company-form-tab-panel${activeTab === "generale" ? " company-form-tab-panel--active" : ""}`}
          data-form-tab="generale"
        >
          <fieldset className="company-form-section">
            <legend>Dati generali</legend>

            <label htmlFor="name">Ragione sociale</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              {...fieldValidation({
                required: "Indica la ragione sociale dell'azienda",
              })}
            />

            <label htmlFor="fatturato">Fatturato annuo (€)</label>
            <input
              id="fatturato"
              type="number"
              min="0"
              step="0.01"
              value={form.fatturato}
              onChange={(e) => updateField("fatturato", e.target.value)}
              placeholder="Es. 1500000"
            />

            <label htmlFor="ccnl">CCNL applicato</label>
            <input
              id="ccnl"
              type="text"
              value={form.ccnl}
              onChange={(e) => updateField("ccnl", e.target.value)}
              placeholder="Es. Metalmeccanici - Industria"
            />
          </fieldset>

          <fieldset className="company-form-section">
            <legend>Servizi</legend>

            <label htmlFor="servizi">Elenco servizi</label>
            <textarea
              id="servizi"
              value={form.servizi}
              onChange={(e) => updateField("servizi", e.target.value)}
              placeholder="Un servizio per riga&#10;Es. Manutenzione impianti&#10;Pulizie industriali"
              rows={4}
            />
            <p className="company-form-hint">Inserisci un servizio per riga.</p>
          </fieldset>
        </div>

        <div
          className={`company-form-tab-panel${activeTab === "organizzazione" ? " company-form-tab-panel--active" : ""}`}
          data-form-tab="organizzazione"
        >
          <fieldset className="company-form-section">
            <legend>Dipendenti per categoria</legend>
            <p className="company-form-hint">
              Indica le categorie professionali e il numero di dipendenti per ciascuna.
            </p>

            {form.dipendenti.map((dipendente, index) => (
              <div key={index} className="company-form-row">
                <div className="company-form-row-fields">
                  <label htmlFor={`dip-cat-${index}`}>Categoria</label>
                  <input
                    id={`dip-cat-${index}`}
                    type="text"
                    value={dipendente.categoria}
                    onChange={(e) => updateDipendente(index, "categoria", e.target.value)}
                    placeholder="Es. Operai qualificati"
                  />
                  <label htmlFor={`dip-num-${index}`}>Numero</label>
                  <input
                    id={`dip-num-${index}`}
                    type="number"
                    min="0"
                    value={dipendente.numero}
                    onChange={(e) => updateDipendente(index, "numero", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="company-form-row-remove"
                  onClick={() =>
                    updateField(
                      "dipendenti",
                      form.dipendenti.filter((_, i) => i !== index),
                    )
                  }
                >
                  Rimuovi
                </button>
              </div>
            ))}

            <button
              type="button"
              className="company-form-add"
              onClick={() =>
                updateField("dipendenti", [...form.dipendenti, emptyDipendente()])
              }
            >
              + Aggiungi categoria
            </button>
          </fieldset>

          <fieldset className="company-form-section">
            <legend>Certificazioni</legend>
            <p className="company-form-hint">
              Aggiungi le certificazioni possedute con ente certificatore e data di scadenza.
            </p>

            {form.certificazioni.map((cert, index) => (
              <div key={index} className="company-form-row">
                <div className="company-form-row-fields company-form-row-fields--cert">
                  <label htmlFor={`cert-nome-${index}`}>Certificazione</label>
                  <input
                    id={`cert-nome-${index}`}
                    type="text"
                    value={cert.nome}
                    onChange={(e) => updateCertificazione(index, "nome", e.target.value)}
                    placeholder="Es. ISO 9001:2015"
                  />
                  <label htmlFor={`cert-ente-${index}`}>Ente certificatore</label>
                  <input
                    id={`cert-ente-${index}`}
                    type="text"
                    value={cert.ente}
                    onChange={(e) => updateCertificazione(index, "ente", e.target.value)}
                    placeholder="Es. IMQ, RINA"
                  />
                  <label htmlFor={`cert-scad-${index}`}>Scadenza</label>
                  <input
                    id={`cert-scad-${index}`}
                    type="date"
                    value={cert.scadenza ?? ""}
                    onChange={(e) => updateCertificazione(index, "scadenza", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="company-form-row-remove"
                  onClick={() =>
                    updateField(
                      "certificazioni",
                      form.certificazioni.filter((_, i) => i !== index),
                    )
                  }
                >
                  Rimuovi
                </button>
              </div>
            ))}

            <button
              type="button"
              className="company-form-add"
              onClick={() =>
                updateField("certificazioni", [...form.certificazioni, emptyCertificazione()])
              }
            >
              + Aggiungi certificazione
            </button>
          </fieldset>
        </div>

        <div
          className={`company-form-tab-panel${activeTab === "esperienze" ? " company-form-tab-panel--active" : ""}`}
          data-form-tab="esperienze"
        >
          <fieldset className="company-form-section">
            <legend>Esperienze pregresse</legend>
            <p className="company-form-hint">
              Inserisci gli appalti o i lavori simili svolti in precedenza.
            </p>

            {form.esperienze.map((esp, index) => (
              <div key={index} className="company-form-row">
                <div className="company-form-row-fields company-form-row-fields--exp">
                  <label htmlFor={`esp-tit-${index}`}>Titolo / Oggetto</label>
                  <input
                    id={`esp-tit-${index}`}
                    type="text"
                    value={esp.titolo}
                    onChange={(e) => updateEsperienza(index, "titolo", e.target.value)}
                    placeholder="Es. Manutenzione impianti scolastici"
                  />
                  <label htmlFor={`esp-com-${index}`}>Committente</label>
                  <input
                    id={`esp-com-${index}`}
                    type="text"
                    value={esp.committente}
                    onChange={(e) => updateEsperienza(index, "committente", e.target.value)}
                    placeholder="Es. Comune di Milano"
                  />
                  <label htmlFor={`esp-anno-${index}`}>Anno</label>
                  <input
                    id={`esp-anno-${index}`}
                    type="text"
                    value={esp.anno}
                    onChange={(e) => updateEsperienza(index, "anno", e.target.value)}
                    placeholder="Es. 2023"
                  />
                  <label htmlFor={`esp-imp-${index}`}>Importo (€)</label>
                  <input
                    id={`esp-imp-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={esp.importo ?? ""}
                    onChange={(e) => updateEsperienza(index, "importo", e.target.value)}
                    placeholder="Es. 250000"
                  />
                  <label htmlFor={`esp-desc-${index}`}>Descrizione</label>
                  <textarea
                    id={`esp-desc-${index}`}
                    value={esp.descrizione}
                    onChange={(e) => updateEsperienza(index, "descrizione", e.target.value)}
                    rows={2}
                    placeholder="Breve descrizione dell'attività svolta"
                  />
                </div>
                <button
                  type="button"
                  className="company-form-row-remove"
                  onClick={() =>
                    updateField(
                      "esperienze",
                      form.esperienze.filter((_, i) => i !== index),
                    )
                  }
                >
                  Rimuovi
                </button>
              </div>
            ))}

            <button
              type="button"
              className="company-form-add"
              onClick={() =>
                updateField("esperienze", [...form.esperienze, emptyEsperienza()])
              }
            >
              + Aggiungi esperienza
            </button>
          </fieldset>
        </div>

        <div
          className={`company-form-tab-panel${activeTab === "societari" ? " company-form-tab-panel--active" : ""}`}
          data-form-tab="societari"
        >
          <CompanyCorporateFormSection
            data={form.corporate}
            onChange={(corporate) => updateField("corporate", corporate)}
          />
        </div>

        {error && <p className="company-form-error">{error}</p>}

        <div className="company-form-actions">
          <Link to={isEdit && companyId ? `/companies/${companyId}` : "/companies"}>
            Annulla
          </Link>
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Crea azienda"}
          </button>
        </div>
      </form>
    </div>
  );
}
