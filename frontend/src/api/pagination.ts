export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const response = await fetchPage(page);
    items.push(...response.results);
    if (!response.next) {
      break;
    }
    page += 1;
  }

  return items;
}

export function isPaginatedResponse<T>(data: unknown): data is PaginatedResponse<T> {
  return (
    typeof data === "object" &&
    data !== null &&
    "results" in data &&
    Array.isArray((data as PaginatedResponse<T>).results)
  );
}
