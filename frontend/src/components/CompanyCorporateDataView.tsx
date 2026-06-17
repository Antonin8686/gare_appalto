import type { Company } from "../types/company";
import { FORMA_GIURIDICA_LABELS } from "../types/company";
import "./CompanyCorporateDataView.css";

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatScadenza(date: string | null): string {
  return formatDate(date);
}

interface CompanyCorporateDataViewProps {
  company: Company;
}

export function CompanyCorporateDataView({ company }: CompanyCorporateDataViewProps) {
  const hasCciai =
    company.iscrizione_cciaa?.rea ||
    company.iscrizione_cciaa?.provincia ||
    company.iscrizione_cciaa?.data_iscrizione;

  const hasRating =
    company.rating_legalita?.stelle ||
    company.rating_legalita?.ente ||
    company.rating_legalita?.scadenza;

  return (
    <div className="company-corporate-view">
      <section className="company-detail-card">
        <h3 className="company-detail-section-title">Identificativi</h3>
        <dl className="company-detail-fields company-detail-fields--grid">
          <div>
            <dt>Partita IVA</dt>
            <dd>{company.partita_iva || "—"}</dd>
          </div>
          <div>
            <dt>Codice fiscale</dt>
            <dd>{company.codice_fiscale || "—"}</dd>
          </div>
          <div>
            <dt>Forma giuridica</dt>
            <dd>{FORMA_GIURIDICA_LABELS[company.forma_giuridica] ?? "—"}</dd>
          </div>
        </dl>
        {company.oggetto_sociale && (
          <div className="company-corporate-view__text-block">
            <h4>Oggetto sociale</h4>
            <p>{company.oggetto_sociale}</p>
          </div>
        )}
      </section>

      {hasCciai && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Iscrizione CCIAA</h3>
          <dl className="company-detail-fields company-detail-fields--grid">
            <div>
              <dt>Numero REA</dt>
              <dd>{company.iscrizione_cciaa.rea || "—"}</dd>
            </div>
            <div>
              <dt>Provincia</dt>
              <dd>{company.iscrizione_cciaa.provincia || "—"}</dd>
            </div>
            <div>
              <dt>Data iscrizione</dt>
              <dd>{formatDate(company.iscrizione_cciaa.data_iscrizione)}</dd>
            </div>
          </dl>
        </section>
      )}

      {company.codici_ateco.length > 0 && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Codici ATECO</h3>
          <table className="company-detail-table">
            <thead>
              <tr>
                <th>Codice</th>
                <th>Descrizione</th>
              </tr>
            </thead>
            <tbody>
              {company.codici_ateco.map((ateco) => (
                <tr key={`${ateco.codice}-${ateco.descrizione}`}>
                  <td>{ateco.codice}</td>
                  <td>{ateco.descrizione || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {company.sedi_legali.length > 0 && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Sedi legali</h3>
          <div className="company-corporate-view__sedi">
            {company.sedi_legali.map((sede, index) => (
              <article key={index} className="company-corporate-view__sede">
                {sede.principale && (
                  <span className="company-detail-badge">Principale</span>
                )}
                <p>{sede.indirizzo}</p>
                <p>
                  {sede.cap} {sede.citta} ({sede.provincia}) — {sede.nazione}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {company.sedi_operative.length > 0 && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Sedi operative</h3>
          <div className="company-corporate-view__sedi">
            {company.sedi_operative.map((sede, index) => (
              <article key={index} className="company-corporate-view__sede">
                {sede.principale && (
                  <span className="company-detail-badge">Principale</span>
                )}
                <p>{sede.indirizzo}</p>
                <p>
                  {sede.cap} {sede.citta} ({sede.provincia}) — {sede.nazione}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {company.autorizzazioni.length > 0 && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Autorizzazioni</h3>
          <TitoloScadenzaTable items={company.autorizzazioni} />
        </section>
      )}

      {company.licenze.length > 0 && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Licenze</h3>
          <TitoloScadenzaTable items={company.licenze} />
        </section>
      )}

      {hasRating && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Rating di legalità</h3>
          <dl className="company-detail-fields company-detail-fields--grid">
            <div>
              <dt>Stelle</dt>
              <dd>
                {company.rating_legalita.stelle
                  ? `${company.rating_legalita.stelle} / 3`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Ente</dt>
              <dd>{company.rating_legalita.ente || "—"}</dd>
            </div>
            <div>
              <dt>Scadenza</dt>
              <dd>{formatScadenza(company.rating_legalita.scadenza)}</dd>
            </div>
          </dl>
        </section>
      )}

      {company.attestazioni_soa.length > 0 && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Attestazioni SOA</h3>
          <table className="company-detail-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Classifica</th>
                <th>Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {company.attestazioni_soa.map((soa) => (
                <tr key={`${soa.categoria}-${soa.classifica}`}>
                  <td>{soa.categoria}</td>
                  <td>{soa.classifica || "—"}</td>
                  <td>{formatScadenza(soa.scadenza)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {company.referenze_bancarie.length > 0 && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Referenze bancarie</h3>
          <table className="company-detail-table">
            <thead>
              <tr>
                <th>Istituto</th>
                <th>Filiale</th>
                <th>IBAN</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {company.referenze_bancarie.map((ref) => (
                <tr key={`${ref.istituto}-${ref.iban}`}>
                  <td>{ref.istituto}</td>
                  <td>{ref.filiale || "—"}</td>
                  <td className="company-corporate-view__mono">{ref.iban || "—"}</td>
                  <td>{ref.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {company.polizze_assicurative.length > 0 && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Polizze assicurative</h3>
          <table className="company-detail-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Compagnia</th>
                <th>Massimale</th>
                <th>Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {company.polizze_assicurative.map((polizza) => (
                <tr key={`${polizza.tipo}-${polizza.compagnia}`}>
                  <td>{polizza.tipo}</td>
                  <td>{polizza.compagnia || "—"}</td>
                  <td>{polizza.massimale || "—"}</td>
                  <td>{formatScadenza(polizza.scadenza)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {company.presenza_territoriale.length > 0 && (
        <section className="company-detail-card">
          <h3 className="company-detail-section-title">Presenza territoriale</h3>
          <table className="company-detail-table">
            <thead>
              <tr>
                <th>Regione</th>
                <th>Province</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {company.presenza_territoriale.map((item) => (
                <tr key={item.regione}>
                  <td>{item.regione}</td>
                  <td>{item.province.length > 0 ? item.province.join(", ") : "—"}</td>
                  <td>{item.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {!company.partita_iva &&
        !company.codice_fiscale &&
        !company.oggetto_sociale &&
        company.codici_ateco.length === 0 &&
        company.sedi_legali.length === 0 &&
        company.sedi_operative.length === 0 &&
        company.autorizzazioni.length === 0 &&
        company.licenze.length === 0 &&
        !hasRating &&
        company.attestazioni_soa.length === 0 &&
        company.referenze_bancarie.length === 0 &&
        company.polizze_assicurative.length === 0 &&
        company.presenza_territoriale.length === 0 && (
          <section className="company-detail-card">
            <p className="company-detail-empty">
              Nessun dato societario inserito. Usa Modifica per compilare la scheda.
            </p>
          </section>
        )}
    </div>
  );
}

function TitoloScadenzaTable({
  items,
}: {
  items: { nome: string; ente: string; numero: string; scadenza: string | null }[];
}) {
  return (
    <table className="company-detail-table">
      <thead>
        <tr>
          <th>Denominazione</th>
          <th>Ente</th>
          <th>Numero</th>
          <th>Scadenza</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.nome}-${item.numero}`}>
            <td>{item.nome}</td>
            <td>{item.ente || "—"}</td>
            <td>{item.numero || "—"}</td>
            <td>{formatScadenza(item.scadenza)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
