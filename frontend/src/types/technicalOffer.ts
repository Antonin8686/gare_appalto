export type TechnicalOfferCategory =
  | "organizzazione"
  | "metodologia"
  | "personale"
  | "attrezzature"
  | "sicurezza"
  | "ambiente"
  | "qualita"
  | "altro";

export type TechnicalOfferSettore =
  | "pulizie"
  | "verde"
  | "manutenzione"
  | "facility"
  | "it"
  | "consulenza"
  | "trasporti"
  | "sanita"
  | "cultura"
  | "altro"
  | "";

export interface TechnicalOffer {
  id: number;
  title: string;
  category: TechnicalOfferCategory;
  category_display: string;
  settore: TechnicalOfferSettore;
  settore_display: string;
  tipologia_servizio: string;
  ente_appaltante: string;
  valore_appalto: string | null;
  durata: string;
  anno: number | null;
  punteggio_ottenuto: string | null;
  content: string;
  tags: string[];
  parole_chiave: string[];
  riutilizzabilita: number;
  innovativita: number;
  rag_text: string;
  rag_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TechnicalOfferPayload {
  title: string;
  category: TechnicalOfferCategory;
  settore?: TechnicalOfferSettore;
  tipologia_servizio?: string;
  ente_appaltante?: string;
  valore_appalto?: string | null;
  durata?: string;
  anno?: number | null;
  punteggio_ottenuto?: string | null;
  content: string;
  tags: string[];
  parole_chiave: string[];
  riutilizzabilita: number;
  innovativita: number;
}

export interface TechnicalOfferFilters {
  q?: string;
  category?: TechnicalOfferCategory | "";
  settore?: TechnicalOfferSettore;
  tipologia_servizio?: string;
  ente_appaltante?: string;
  anno?: number | "";
  riutilizzabilita?: number | "";
  innovativita?: number | "";
  parola_chiave?: string;
  valore_min?: string;
  valore_max?: string;
  punteggio_min?: string;
}

export interface TechnicalOfferFacets {
  category: Record<string, number>;
  settore: Record<string, number>;
  anni: Record<string, number>;
}

export const TECHNICAL_OFFER_CATEGORIES: {
  value: TechnicalOfferCategory;
  label: string;
}[] = [
  { value: "organizzazione", label: "Organizzazione servizio" },
  { value: "metodologia", label: "Metodologia operativa" },
  { value: "personale", label: "Personale e formazione" },
  { value: "attrezzature", label: "Attrezzature e mezzi" },
  { value: "sicurezza", label: "Sicurezza sul lavoro" },
  { value: "ambiente", label: "Tutela ambientale" },
  { value: "qualita", label: "Sistema qualità" },
  { value: "altro", label: "Altro" },
];

export const TECHNICAL_OFFER_SETTORI: {
  value: TechnicalOfferSettore;
  label: string;
}[] = [
  { value: "", label: "Tutti i settori" },
  { value: "pulizie", label: "Pulizie e sanificazione" },
  { value: "verde", label: "Verde e parchi" },
  { value: "manutenzione", label: "Manutenzione edile" },
  { value: "facility", label: "Facility management" },
  { value: "it", label: "ICT e software" },
  { value: "consulenza", label: "Consulenza professionale" },
  { value: "trasporti", label: "Trasporti e logistica" },
  { value: "sanita", label: "Sanità e sociale" },
  { value: "cultura", label: "Cultura e eventi" },
  { value: "altro", label: "Altro" },
];

export const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

export function categoryLabel(category: TechnicalOfferCategory): string {
  return (
    TECHNICAL_OFFER_CATEGORIES.find((c) => c.value === category)?.label ?? category
  );
}

export function settoreLabel(settore: TechnicalOfferSettore): string {
  if (!settore) return "—";
  return TECHNICAL_OFFER_SETTORI.find((s) => s.value === settore)?.label ?? settore;
}

export function formatValoreAppalto(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPunteggio(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("it-IT", { maximumFractionDigits: 2 });
}

export function groupOffersByCategory(
  offers: TechnicalOffer[],
): { category: TechnicalOfferCategory; label: string; items: TechnicalOffer[] }[] {
  const groups = new Map<TechnicalOfferCategory, TechnicalOffer[]>();
  for (const offer of offers) {
    const list = groups.get(offer.category) ?? [];
    list.push(offer);
    groups.set(offer.category, list);
  }
  return TECHNICAL_OFFER_CATEGORIES.filter((cat) => groups.has(cat.value)).map((cat) => ({
    category: cat.value,
    label: cat.label,
    items: groups.get(cat.value) ?? [],
  }));
}
