export type FormaGiuridica =
  | ""
  | "srl"
  | "spa"
  | "snc"
  | "sas"
  | "cooperativa"
  | "ditta_individuale"
  | "consorzio"
  | "altro";

export const FORMA_GIURIDICA_OPTIONS: { value: FormaGiuridica; label: string }[] = [
  { value: "", label: "— Seleziona —" },
  { value: "srl", label: "S.r.l." },
  { value: "spa", label: "S.p.A." },
  { value: "snc", label: "S.n.c." },
  { value: "sas", label: "S.a.s." },
  { value: "cooperativa", label: "Cooperativa" },
  { value: "ditta_individuale", label: "Ditta individuale" },
  { value: "consorzio", label: "Consorzio" },
  { value: "altro", label: "Altro" },
];

export const FORMA_GIURIDICA_LABELS: Record<FormaGiuridica, string> = {
  "": "—",
  srl: "S.r.l.",
  spa: "S.p.A.",
  snc: "S.n.c.",
  sas: "S.a.s.",
  cooperativa: "Cooperativa",
  ditta_individuale: "Ditta individuale",
  consorzio: "Consorzio",
  altro: "Altro",
};

export interface IscrizioneCciai {
  rea: string;
  provincia: string;
  data_iscrizione: string | null;
}

export interface CodiceAteco {
  codice: string;
  descrizione: string;
}

export interface Sede {
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  nazione: string;
  principale: boolean;
}

export interface TitoloScadenza {
  nome: string;
  ente: string;
  numero: string;
  scadenza: string | null;
}

export interface RatingLegalita {
  stelle: number | null;
  ente: string;
  scadenza: string | null;
}

export interface AttestazioneSoa {
  categoria: string;
  classifica: string;
  scadenza: string | null;
}

export interface ReferenzaBancaria {
  istituto: string;
  filiale: string;
  iban: string;
  note: string;
}

export interface PolizzaAssicurativa {
  tipo: string;
  compagnia: string;
  massimale: string | null;
  scadenza: string | null;
}

export interface PresenzaTerritoriale {
  regione: string;
  province: string[];
  note: string;
}

export interface Certificazione {
  nome: string;
  ente: string;
  scadenza: string | null;
}

export interface DipendenteCategoria {
  categoria: string;
  numero: number;
}

export interface Esperienza {
  titolo: string;
  committente: string;
  anno: string;
  importo: string | null;
  descrizione: string;
}

type EsperienzaRaw = Partial<Esperienza> & { oggetto?: string };

export function normalizeEsperienza(item: EsperienzaRaw): Esperienza {
  return {
    titolo: (item.titolo ?? item.oggetto ?? "").trim(),
    committente: item.committente ?? "",
    anno: item.anno ?? "",
    importo: item.importo ?? null,
    descrizione: item.descrizione ?? "",
  };
}

export function normalizeEsperienze(items: EsperienzaRaw[] | undefined): Esperienza[] {
  if (!items?.length) return [];
  return items.map(normalizeEsperienza);
}

export interface CompanyCorporateData {
  partita_iva: string;
  codice_fiscale: string;
  forma_giuridica: FormaGiuridica;
  iscrizione_cciaa: IscrizioneCciai;
  codici_ateco: CodiceAteco[];
  oggetto_sociale: string;
  sedi_legali: Sede[];
  sedi_operative: Sede[];
  autorizzazioni: TitoloScadenza[];
  licenze: TitoloScadenza[];
  rating_legalita: RatingLegalita;
  attestazioni_soa: AttestazioneSoa[];
  referenze_bancarie: ReferenzaBancaria[];
  polizze_assicurative: PolizzaAssicurativa[];
  presenza_territoriale: PresenzaTerritoriale[];
}

export interface Company extends CompanyCorporateData {
  id: number;
  name: string;
  fatturato: string | null;
  ccnl: string;
  dipendenti: DipendenteCategoria[];
  esperienze: Esperienza[];
  certificazioni: Certificazione[];
  servizi: string[];
  created_at: string;
  updated_at: string;
}

export interface CompanyPayload extends CompanyCorporateData {
  name: string;
  fatturato: string | null;
  ccnl: string;
  dipendenti: DipendenteCategoria[];
  esperienze: Esperienza[];
  certificazioni: Certificazione[];
  servizi: string[];
}

export function emptyIscrizioneCciai(): IscrizioneCciai {
  return { rea: "", provincia: "", data_iscrizione: null };
}

export function emptyCodiceAteco(): CodiceAteco {
  return { codice: "", descrizione: "" };
}

export function emptySede(): Sede {
  return {
    indirizzo: "",
    cap: "",
    citta: "",
    provincia: "",
    nazione: "Italia",
    principale: false,
  };
}

export function emptyTitoloScadenza(): TitoloScadenza {
  return { nome: "", ente: "", numero: "", scadenza: null };
}

export function emptyRatingLegalita(): RatingLegalita {
  return { stelle: null, ente: "", scadenza: null };
}

export function emptyAttestazioneSoa(): AttestazioneSoa {
  return { categoria: "", classifica: "", scadenza: null };
}

export function emptyReferenzaBancaria(): ReferenzaBancaria {
  return { istituto: "", filiale: "", iban: "", note: "" };
}

export function emptyPolizzaAssicurativa(): PolizzaAssicurativa {
  return { tipo: "", compagnia: "", massimale: null, scadenza: null };
}

export function emptyPresenzaTerritoriale(): PresenzaTerritoriale {
  return { regione: "", province: [], note: "" };
}

export function emptyCorporateData(): CompanyCorporateData {
  return {
    partita_iva: "",
    codice_fiscale: "",
    forma_giuridica: "",
    iscrizione_cciaa: emptyIscrizioneCciai(),
    codici_ateco: [],
    oggetto_sociale: "",
    sedi_legali: [],
    sedi_operative: [],
    autorizzazioni: [],
    licenze: [],
    rating_legalita: emptyRatingLegalita(),
    attestazioni_soa: [],
    referenze_bancarie: [],
    polizze_assicurative: [],
    presenza_territoriale: [],
  };
}

export function corporateDataFromCompany(company: Company): CompanyCorporateData {
  return {
    partita_iva: company.partita_iva ?? "",
    codice_fiscale: company.codice_fiscale ?? "",
    forma_giuridica: company.forma_giuridica ?? "",
    iscrizione_cciaa: company.iscrizione_cciaa ?? emptyIscrizioneCciai(),
    codici_ateco: company.codici_ateco ?? [],
    oggetto_sociale: company.oggetto_sociale ?? "",
    sedi_legali: company.sedi_legali ?? [],
    sedi_operative: company.sedi_operative ?? [],
    autorizzazioni: company.autorizzazioni ?? [],
    licenze: company.licenze ?? [],
    rating_legalita: company.rating_legalita ?? emptyRatingLegalita(),
    attestazioni_soa: company.attestazioni_soa ?? [],
    referenze_bancarie: company.referenze_bancarie ?? [],
    polizze_assicurative: company.polizze_assicurative ?? [],
    presenza_territoriale: company.presenza_territoriale ?? [],
  };
}

export function emptyCertificazione(): Certificazione {
  return { nome: "", ente: "", scadenza: null };
}

export function emptyDipendente(): DipendenteCategoria {
  return { categoria: "", numero: 0 };
}

export function emptyEsperienza(): Esperienza {
  return { titolo: "", committente: "", anno: "", importo: null, descrizione: "" };
}
