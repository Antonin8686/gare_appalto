export function normalizePartitaIva(value: string): string {
  return value.replace(/\s/g, "").toUpperCase();
}

export function normalizeCodiceFiscale(value: string): string {
  return value.replace(/\s/g, "").toUpperCase();
}

export function isValidPartitaIva(value: string): boolean {
  const cleaned = normalizePartitaIva(value);
  if (!cleaned) return true;
  if (!/^\d{11}$/.test(cleaned)) return false;
  const digits = cleaned.split("").map(Number);
  let checksum = 0;
  for (let index = 0; index < 10; index += 1) {
    const digit = digits[index];
    if (index % 2 === 0) {
      checksum += digit;
    } else {
      const doubled = digit * 2;
      checksum += Math.floor(doubled / 10) + (doubled % 10);
    }
  }
  const control = (10 - (checksum % 10)) % 10;
  return control === digits[10];
}

export function isValidCodiceFiscale(value: string): boolean {
  const cleaned = normalizeCodiceFiscale(value);
  if (!cleaned) return true;
  if (/^\d{11}$/.test(cleaned)) return isValidPartitaIva(cleaned);
  return /^[A-Z0-9]{16}$/.test(cleaned);
}

export function isValidCap(value: string): boolean {
  const cleaned = value.trim();
  if (!cleaned) return true;
  return /^\d{5}$/.test(cleaned);
}

export function isValidProvincia(value: string): boolean {
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) return true;
  return /^[A-Z]{2}$/.test(cleaned);
}

export function isValidIban(value: string): boolean {
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  if (!cleaned) return true;
  return /^IT\d{2}[A-Z0-9]{23}$/.test(cleaned);
}

export function provincesToText(provinces: string[]): string {
  return provinces.join(", ");
}

export function textToProvinces(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((item) => item.trim().toUpperCase().slice(0, 2))
    .filter(Boolean);
}
