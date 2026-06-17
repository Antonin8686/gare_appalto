import type { TenderFase, TenderPriorita, TenderSource, TenderStato } from "./tender";

export type DashboardPeriod = "7d" | "30d" | "90d" | "365d" | "all";

export interface DashboardFilters {
  period: DashboardPeriod;
  source: TenderSource | "";
  fase: TenderFase | "";
  doc_days: number;
}

export interface DashboardTenderBrief {
  id: number;
  cig: string;
  oggetto: string;
  importo: string;
  scadenza: string;
  stato: TenderStato;
  fase: TenderFase;
  source: TenderSource;
  priorita: TenderPriorita;
  priority_score: number;
  giorni_rimanenti?: number;
}

export interface DashboardOffertaItem {
  tender_id: number;
  cig: string;
  oggetto: string;
  scadenza: string;
  company_id: number | null;
  company_name: string | null;
  sections_count: number;
  tipo: "fase_offerta" | "relazione_tecnica";
}

export interface DashboardMatchItem {
  tender_id: number;
  cig: string;
  oggetto: string;
  company_id: number;
  company_name: string;
  semaforo: "verde" | "giallo" | "rosso";
  motivazione: string;
}

export interface DashboardDocumentItem {
  id: number;
  company_id: number;
  company_name: string;
  original_filename: string;
  categoria: string;
  categoria_label: string;
  data_scadenza: string | null;
  stato_validita: string;
  giorni_alla_scadenza: number | null;
}

export interface DashboardTimePoint {
  week_start: string;
  count: number;
}

export interface DashboardKPIs {
  generated_at: string;
  filters: {
    period: DashboardPeriod;
    source: string | null;
    fase: string | null;
    doc_days: number;
  };
  indicatori: {
    gare_importate: number;
    gare_analizzate: number;
    gare_partecipabili: number;
    gare_rti: number;
    gare_avvalimento: number;
    offerte_in_corso: number;
    offerte_presentate: number;
    documenti_in_scadenza: number;
  };
  globali: {
    gare_totali: number;
    gare_aperte: number;
    importo_totale: string;
    importo_gare_aperte: string;
    tasso_analisi: number;
    tasso_partecipabilita: number;
    tasso_conversione_offerte: number;
    match_verdi: number;
    aziende: number;
  };
  serie_temporale: {
    gare_importate: DashboardTimePoint[];
    gare_analizzate: DashboardTimePoint[];
    offerte_in_corso: DashboardTimePoint[];
    scadenze_gare: DashboardTimePoint[];
  };
  distribuzione: {
    per_fase: Record<string, number>;
    per_sorgente: Record<string, number>;
  };
  documenti: {
    in_scadenza: number;
    items: DashboardDocumentItem[];
  };
  gare: {
    total: number;
    aperte: number;
    scadenza_oggi: number;
    scadenza_settimana: number;
    oggi: DashboardTenderBrief[];
  };
  offerte: {
    in_corso: number;
    presentate: number;
    fase_offerta: number;
    relazioni_tecniche: number;
    libreria: number;
    items: DashboardOffertaItem[];
  };
  scouting: {
    total: number;
    alta: number;
    media: number;
    bassa: number;
    ultimo_import: string | null;
    opportunita: DashboardTenderBrief[];
  };
  compatibilita: {
    aziende: number;
    valutazioni: number;
    gare_valutate: number;
    gare_con_verde: number;
    semaforo: { verde: number; giallo: number; rosso: number };
    migliori_match: DashboardMatchItem[];
  };
}
