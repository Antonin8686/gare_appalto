import { isAxiosError } from "axios";

export function formatApiError(error: unknown, fallback = "Operazione non riuscita."): string {
  if (!isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "object" && data !== null) {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      if (Array.isArray(value)) return value.map((msg) => `${field}: ${msg}`);
      if (typeof value === "string") return [`${field}: ${value}`];
      return [];
    });
    if (messages.length) return messages.join(" ");
  }
  return fallback;
}
