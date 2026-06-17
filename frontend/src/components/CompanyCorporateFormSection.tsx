import type {
  AttestazioneSoa,
  CompanyCorporateData,
  PolizzaAssicurativa,
  PresenzaTerritoriale,
  ReferenzaBancaria,
  Sede,
  TitoloScadenza,
} from "../types/company";
import {
  FORMA_GIURIDICA_OPTIONS,
  emptyAttestazioneSoa,
  emptyCodiceAteco,
  emptyPolizzaAssicurativa,
  emptyPresenzaTerritoriale,
  emptyReferenzaBancaria,
  emptySede,
  emptyTitoloScadenza,
} from "../types/company";
import { provincesToText, textToProvinces } from "../utils/companyValidation";
import "./CompanyCorporateFormSection.css";

interface CompanyCorporateFormSectionProps {
  data: CompanyCorporateData;
  onChange: (data: CompanyCorporateData) => void;
}

function updateListItem<T>(
  list: T[],
  index: number,
  patch: Partial<T>,
): T[] {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

function SedeRows({
  label,
  sedi,
  onChange,
}: {
  label: string;
  sedi: Sede[];
  onChange: (sedi: Sede[]) => void;
}) {
  return (
    <div className="company-corporate-block">
      <h4 className="company-corporate-block__title">{label}</h4>
      {sedi.map((sede, index) => (
        <div key={index} className="company-corporate-row">
          <div className="company-corporate-row__fields company-corporate-row__fields--sede">
            <label htmlFor={`${label}-ind-${index}`}>Indirizzo</label>
            <input
              id={`${label}-ind-${index}`}
              type="text"
              value={sede.indirizzo}
              onChange={(e) =>
                onChange(updateListItem(sedi, index, { indirizzo: e.target.value }))
              }
              placeholder="Via, numero civico"
            />
            <label htmlFor={`${label}-cap-${index}`}>CAP</label>
            <input
              id={`${label}-cap-${index}`}
              type="text"
              value={sede.cap}
              onChange={(e) =>
                onChange(updateListItem(sedi, index, { cap: e.target.value }))
              }
              maxLength={5}
              pattern="\d{5}"
              title="CAP di 5 cifre"
            />
            <label htmlFor={`${label}-citta-${index}`}>Città</label>
            <input
              id={`${label}-citta-${index}`}
              type="text"
              value={sede.citta}
              onChange={(e) =>
                onChange(updateListItem(sedi, index, { citta: e.target.value }))
              }
            />
            <label htmlFor={`${label}-prov-${index}`}>Provincia</label>
            <input
              id={`${label}-prov-${index}`}
              type="text"
              value={sede.provincia}
              onChange={(e) =>
                onChange(
                  updateListItem(sedi, index, {
                    provincia: e.target.value.toUpperCase().slice(0, 2),
                  }),
                )
              }
              maxLength={2}
              pattern="[A-Za-z]{2}"
              title="Sigla provincia di 2 lettere"
            />
            <label htmlFor={`${label}-naz-${index}`}>Nazione</label>
            <input
              id={`${label}-naz-${index}`}
              type="text"
              value={sede.nazione}
              onChange={(e) =>
                onChange(updateListItem(sedi, index, { nazione: e.target.value }))
              }
            />
            <label className="company-corporate-checkbox">
              <input
                type="checkbox"
                checked={sede.principale}
                onChange={(e) =>
                  onChange(updateListItem(sedi, index, { principale: e.target.checked }))
                }
              />
              Sede principale
            </label>
          </div>
          <button
            type="button"
            className="company-corporate-row__remove"
            onClick={() => onChange(sedi.filter((_, i) => i !== index))}
          >
            Rimuovi
          </button>
        </div>
      ))}
      <button
        type="button"
        className="company-corporate-add"
        onClick={() => onChange([...sedi, emptySede()])}
      >
        + Aggiungi sede
      </button>
    </div>
  );
}

function TitoloScadenzaRows({
  label,
  items,
  onChange,
}: {
  label: string;
  items: TitoloScadenza[];
  onChange: (items: TitoloScadenza[]) => void;
}) {
  return (
    <div className="company-corporate-block">
      <h4 className="company-corporate-block__title">{label}</h4>
      {items.map((item, index) => (
        <div key={index} className="company-corporate-row">
          <div className="company-corporate-row__fields company-corporate-row__fields--wide">
            <label htmlFor={`${label}-nome-${index}`}>Denominazione</label>
            <input
              id={`${label}-nome-${index}`}
              type="text"
              value={item.nome}
              onChange={(e) =>
                onChange(updateListItem(items, index, { nome: e.target.value }))
              }
            />
            <label htmlFor={`${label}-ente-${index}`}>Ente rilascio</label>
            <input
              id={`${label}-ente-${index}`}
              type="text"
              value={item.ente}
              onChange={(e) =>
                onChange(updateListItem(items, index, { ente: e.target.value }))
              }
            />
            <label htmlFor={`${label}-num-${index}`}>Numero</label>
            <input
              id={`${label}-num-${index}`}
              type="text"
              value={item.numero}
              onChange={(e) =>
                onChange(updateListItem(items, index, { numero: e.target.value }))
              }
            />
            <label htmlFor={`${label}-scad-${index}`}>Scadenza</label>
            <input
              id={`${label}-scad-${index}`}
              type="date"
              value={item.scadenza ?? ""}
              onChange={(e) =>
                onChange(
                  updateListItem(items, index, {
                    scadenza: e.target.value || null,
                  }),
                )
              }
            />
          </div>
          <button
            type="button"
            className="company-corporate-row__remove"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            Rimuovi
          </button>
        </div>
      ))}
      <button
        type="button"
        className="company-corporate-add"
        onClick={() => onChange([...items, emptyTitoloScadenza()])}
      >
        + Aggiungi voce
      </button>
    </div>
  );
}

export function CompanyCorporateFormSection({
  data,
  onChange,
}: CompanyCorporateFormSectionProps) {
  function patch<K extends keyof CompanyCorporateData>(
    field: K,
    value: CompanyCorporateData[K],
  ) {
    onChange({ ...data, [field]: value });
  }

  return (
    <fieldset className="company-corporate-section">
      <legend>Dati societari</legend>
      <p className="company-corporate-section__hint">
        Anagrafica legale, iscrizioni, sedi, autorizzazioni e presenza territoriale.
      </p>

      <div className="company-corporate-grid">
        <div>
          <label htmlFor="partita_iva">Partita IVA</label>
          <input
            id="partita_iva"
            type="text"
            inputMode="numeric"
            value={data.partita_iva}
            onChange={(e) => patch("partita_iva", e.target.value)}
            maxLength={11}
            placeholder="11 cifre"
            pattern="\d{11}"
            title="Partita IVA di 11 cifre"
          />
        </div>
        <div>
          <label htmlFor="codice_fiscale">Codice fiscale</label>
          <input
            id="codice_fiscale"
            type="text"
            value={data.codice_fiscale}
            onChange={(e) => patch("codice_fiscale", e.target.value.toUpperCase())}
            maxLength={16}
            pattern="([A-Za-z0-9]{16}|\d{11})"
            title="16 caratteri alfanumerici o 11 cifre"
          />
        </div>
        <div>
          <label htmlFor="forma_giuridica">Forma giuridica</label>
          <select
            id="forma_giuridica"
            value={data.forma_giuridica}
            onChange={(e) =>
              patch("forma_giuridica", e.target.value as CompanyCorporateData["forma_giuridica"])
            }
          >
            {FORMA_GIURIDICA_OPTIONS.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor="oggetto_sociale">Oggetto sociale</label>
      <textarea
        id="oggetto_sociale"
        value={data.oggetto_sociale}
        onChange={(e) => patch("oggetto_sociale", e.target.value)}
        rows={3}
        placeholder="Descrizione dell'oggetto sociale"
      />

      <div className="company-corporate-block">
        <h4 className="company-corporate-block__title">Iscrizione CCIAA</h4>
        <div className="company-corporate-grid">
          <div>
            <label htmlFor="cciaa-rea">Numero REA</label>
            <input
              id="cciaa-rea"
              type="text"
              value={data.iscrizione_cciaa.rea}
              onChange={(e) =>
                patch("iscrizione_cciaa", {
                  ...data.iscrizione_cciaa,
                  rea: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label htmlFor="cciaa-prov">Provincia</label>
            <input
              id="cciaa-prov"
              type="text"
              value={data.iscrizione_cciaa.provincia}
              onChange={(e) =>
                patch("iscrizione_cciaa", {
                  ...data.iscrizione_cciaa,
                  provincia: e.target.value.toUpperCase().slice(0, 2),
                })
              }
              maxLength={2}
              pattern="[A-Za-z]{2}"
              title="Sigla provincia di 2 lettere"
            />
          </div>
          <div>
            <label htmlFor="cciaa-data">Data iscrizione</label>
            <input
              id="cciaa-data"
              type="date"
              value={data.iscrizione_cciaa.data_iscrizione ?? ""}
              onChange={(e) =>
                patch("iscrizione_cciaa", {
                  ...data.iscrizione_cciaa,
                  data_iscrizione: e.target.value || null,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="company-corporate-block">
        <h4 className="company-corporate-block__title">Codici ATECO</h4>
        {data.codici_ateco.map((ateco, index) => (
          <div key={index} className="company-corporate-row">
            <div className="company-corporate-row__fields">
              <label htmlFor={`ateco-cod-${index}`}>Codice</label>
              <input
                id={`ateco-cod-${index}`}
                type="text"
                value={ateco.codice}
                onChange={(e) =>
                  patch(
                    "codici_ateco",
                    updateListItem(data.codici_ateco, index, { codice: e.target.value }),
                  )
                }
                placeholder="Es. 81.21.00"
              />
              <label htmlFor={`ateco-desc-${index}`}>Descrizione</label>
              <input
                id={`ateco-desc-${index}`}
                type="text"
                value={ateco.descrizione}
                onChange={(e) =>
                  patch(
                    "codici_ateco",
                    updateListItem(data.codici_ateco, index, {
                      descrizione: e.target.value,
                    }),
                  )
                }
              />
            </div>
            <button
              type="button"
              className="company-corporate-row__remove"
              onClick={() =>
                patch(
                  "codici_ateco",
                  data.codici_ateco.filter((_, i) => i !== index),
                )
              }
            >
              Rimuovi
            </button>
          </div>
        ))}
        <button
          type="button"
          className="company-corporate-add"
          onClick={() => patch("codici_ateco", [...data.codici_ateco, emptyCodiceAteco()])}
        >
          + Aggiungi codice ATECO
        </button>
      </div>

      <SedeRows
        label="Sedi legali"
        sedi={data.sedi_legali}
        onChange={(sedi) => patch("sedi_legali", sedi)}
      />
      <SedeRows
        label="Sedi operative"
        sedi={data.sedi_operative}
        onChange={(sedi) => patch("sedi_operative", sedi)}
      />

      <TitoloScadenzaRows
        label="Autorizzazioni"
        items={data.autorizzazioni}
        onChange={(items) => patch("autorizzazioni", items)}
      />
      <TitoloScadenzaRows
        label="Licenze"
        items={data.licenze}
        onChange={(items) => patch("licenze", items)}
      />

      <div className="company-corporate-block">
        <h4 className="company-corporate-block__title">Rating di legalità</h4>
        <div className="company-corporate-grid">
          <div>
            <label htmlFor="rating-stelle">Stelle (1–3)</label>
            <select
              id="rating-stelle"
              value={data.rating_legalita.stelle ?? ""}
              onChange={(e) =>
                patch("rating_legalita", {
                  ...data.rating_legalita,
                  stelle: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">—</option>
              <option value="1">1 stella</option>
              <option value="2">2 stelle</option>
              <option value="3">3 stelle</option>
            </select>
          </div>
          <div>
            <label htmlFor="rating-ente">Ente certificatore</label>
            <input
              id="rating-ente"
              type="text"
              value={data.rating_legalita.ente}
              onChange={(e) =>
                patch("rating_legalita", {
                  ...data.rating_legalita,
                  ente: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label htmlFor="rating-scad">Scadenza</label>
            <input
              id="rating-scad"
              type="date"
              value={data.rating_legalita.scadenza ?? ""}
              onChange={(e) =>
                patch("rating_legalita", {
                  ...data.rating_legalita,
                  scadenza: e.target.value || null,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="company-corporate-block">
        <h4 className="company-corporate-block__title">Attestazioni SOA</h4>
        {data.attestazioni_soa.map((soa: AttestazioneSoa, index) => (
          <div key={index} className="company-corporate-row">
            <div className="company-corporate-row__fields">
              <label htmlFor={`soa-cat-${index}`}>Categoria</label>
              <input
                id={`soa-cat-${index}`}
                type="text"
                value={soa.categoria}
                onChange={(e) =>
                  patch(
                    "attestazioni_soa",
                    updateListItem(data.attestazioni_soa, index, {
                      categoria: e.target.value,
                    }),
                  )
                }
              />
              <label htmlFor={`soa-class-${index}`}>Classifica</label>
              <input
                id={`soa-class-${index}`}
                type="text"
                value={soa.classifica}
                onChange={(e) =>
                  patch(
                    "attestazioni_soa",
                    updateListItem(data.attestazioni_soa, index, {
                      classifica: e.target.value,
                    }),
                  )
                }
              />
              <label htmlFor={`soa-scad-${index}`}>Scadenza</label>
              <input
                id={`soa-scad-${index}`}
                type="date"
                value={soa.scadenza ?? ""}
                onChange={(e) =>
                  patch(
                    "attestazioni_soa",
                    updateListItem(data.attestazioni_soa, index, {
                      scadenza: e.target.value || null,
                    }),
                  )
                }
              />
            </div>
            <button
              type="button"
              className="company-corporate-row__remove"
              onClick={() =>
                patch(
                  "attestazioni_soa",
                  data.attestazioni_soa.filter((_, i) => i !== index),
                )
              }
            >
              Rimuovi
            </button>
          </div>
        ))}
        <button
          type="button"
          className="company-corporate-add"
          onClick={() =>
            patch("attestazioni_soa", [...data.attestazioni_soa, emptyAttestazioneSoa()])
          }
        >
          + Aggiungi attestazione SOA
        </button>
      </div>

      <div className="company-corporate-block">
        <h4 className="company-corporate-block__title">Referenze bancarie</h4>
        {data.referenze_bancarie.map((ref: ReferenzaBancaria, index) => (
          <div key={index} className="company-corporate-row">
            <div className="company-corporate-row__fields company-corporate-row__fields--wide">
              <label htmlFor={`bank-ist-${index}`}>Istituto</label>
              <input
                id={`bank-ist-${index}`}
                type="text"
                value={ref.istituto}
                onChange={(e) =>
                  patch(
                    "referenze_bancarie",
                    updateListItem(data.referenze_bancarie, index, {
                      istituto: e.target.value,
                    }),
                  )
                }
              />
              <label htmlFor={`bank-fil-${index}`}>Filiale</label>
              <input
                id={`bank-fil-${index}`}
                type="text"
                value={ref.filiale}
                onChange={(e) =>
                  patch(
                    "referenze_bancarie",
                    updateListItem(data.referenze_bancarie, index, {
                      filiale: e.target.value,
                    }),
                  )
                }
              />
              <label htmlFor={`bank-iban-${index}`}>IBAN</label>
              <input
                id={`bank-iban-${index}`}
                type="text"
                value={ref.iban}
                onChange={(e) =>
                  patch(
                    "referenze_bancarie",
                    updateListItem(data.referenze_bancarie, index, {
                      iban: e.target.value.toUpperCase(),
                    }),
                  )
                }
                pattern="IT\d{2}[A-Z0-9]{23}"
                title="IBAN italiano (27 caratteri)"
              />
              <label htmlFor={`bank-note-${index}`}>Note</label>
              <input
                id={`bank-note-${index}`}
                type="text"
                value={ref.note}
                onChange={(e) =>
                  patch(
                    "referenze_bancarie",
                    updateListItem(data.referenze_bancarie, index, { note: e.target.value }),
                  )
                }
              />
            </div>
            <button
              type="button"
              className="company-corporate-row__remove"
              onClick={() =>
                patch(
                  "referenze_bancarie",
                  data.referenze_bancarie.filter((_, i) => i !== index),
                )
              }
            >
              Rimuovi
            </button>
          </div>
        ))}
        <button
          type="button"
          className="company-corporate-add"
          onClick={() =>
            patch("referenze_bancarie", [
              ...data.referenze_bancarie,
              emptyReferenzaBancaria(),
            ])
          }
        >
          + Aggiungi referenza
        </button>
      </div>

      <div className="company-corporate-block">
        <h4 className="company-corporate-block__title">Polizze assicurative</h4>
        {data.polizze_assicurative.map((polizza: PolizzaAssicurativa, index) => (
          <div key={index} className="company-corporate-row">
            <div className="company-corporate-row__fields company-corporate-row__fields--wide">
              <label htmlFor={`pol-tipo-${index}`}>Tipo polizza</label>
              <input
                id={`pol-tipo-${index}`}
                type="text"
                value={polizza.tipo}
                onChange={(e) =>
                  patch(
                    "polizze_assicurative",
                    updateListItem(data.polizze_assicurative, index, { tipo: e.target.value }),
                  )
                }
              />
              <label htmlFor={`pol-comp-${index}`}>Compagnia</label>
              <input
                id={`pol-comp-${index}`}
                type="text"
                value={polizza.compagnia}
                onChange={(e) =>
                  patch(
                    "polizze_assicurative",
                    updateListItem(data.polizze_assicurative, index, {
                      compagnia: e.target.value,
                    }),
                  )
                }
              />
              <label htmlFor={`pol-mass-${index}`}>Massimale (€)</label>
              <input
                id={`pol-mass-${index}`}
                type="number"
                min="0"
                step="0.01"
                value={polizza.massimale ?? ""}
                onChange={(e) =>
                  patch(
                    "polizze_assicurative",
                    updateListItem(data.polizze_assicurative, index, {
                      massimale: e.target.value.trim() || null,
                    }),
                  )
                }
              />
              <label htmlFor={`pol-scad-${index}`}>Scadenza</label>
              <input
                id={`pol-scad-${index}`}
                type="date"
                value={polizza.scadenza ?? ""}
                onChange={(e) =>
                  patch(
                    "polizze_assicurative",
                    updateListItem(data.polizze_assicurative, index, {
                      scadenza: e.target.value || null,
                    }),
                  )
                }
              />
            </div>
            <button
              type="button"
              className="company-corporate-row__remove"
              onClick={() =>
                patch(
                  "polizze_assicurative",
                  data.polizze_assicurative.filter((_, i) => i !== index),
                )
              }
            >
              Rimuovi
            </button>
          </div>
        ))}
        <button
          type="button"
          className="company-corporate-add"
          onClick={() =>
            patch("polizze_assicurative", [
              ...data.polizze_assicurative,
              emptyPolizzaAssicurativa(),
            ])
          }
        >
          + Aggiungi polizza
        </button>
      </div>

      <div className="company-corporate-block">
        <h4 className="company-corporate-block__title">Presenza territoriale</h4>
        {data.presenza_territoriale.map((item: PresenzaTerritoriale, index) => (
          <div key={index} className="company-corporate-row">
            <div className="company-corporate-row__fields company-corporate-row__fields--wide">
              <label htmlFor={`terr-reg-${index}`}>Regione</label>
              <input
                id={`terr-reg-${index}`}
                type="text"
                value={item.regione}
                onChange={(e) =>
                  patch(
                    "presenza_territoriale",
                    updateListItem(data.presenza_territoriale, index, {
                      regione: e.target.value,
                    }),
                  )
                }
              />
              <label htmlFor={`terr-prov-${index}`}>Province (sigle, separate da virgola)</label>
              <input
                id={`terr-prov-${index}`}
                type="text"
                value={provincesToText(item.province)}
                onChange={(e) =>
                  patch(
                    "presenza_territoriale",
                    updateListItem(data.presenza_territoriale, index, {
                      province: textToProvinces(e.target.value),
                    }),
                  )
                }
                placeholder="Es. MI, BG, BS"
              />
              <label htmlFor={`terr-note-${index}`}>Note</label>
              <input
                id={`terr-note-${index}`}
                type="text"
                value={item.note}
                onChange={(e) =>
                  patch(
                    "presenza_territoriale",
                    updateListItem(data.presenza_territoriale, index, { note: e.target.value }),
                  )
                }
              />
            </div>
            <button
              type="button"
              className="company-corporate-row__remove"
              onClick={() =>
                patch(
                  "presenza_territoriale",
                  data.presenza_territoriale.filter((_, i) => i !== index),
                )
              }
            >
              Rimuovi
            </button>
          </div>
        ))}
        <button
          type="button"
          className="company-corporate-add"
          onClick={() =>
            patch("presenza_territoriale", [
              ...data.presenza_territoriale,
              emptyPresenzaTerritoriale(),
            ])
          }
        >
          + Aggiungi area territoriale
        </button>
      </div>
    </fieldset>
  );
}
