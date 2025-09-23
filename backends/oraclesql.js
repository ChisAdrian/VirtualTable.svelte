const API_BASE = "http://localhost:5151";

/**
 * Face un fetch cu timeout configurabil.
 * Dacă timpul este depășit, request-ul este anulat.
 */
async function fetchWithTimeout(url, options, timeout = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw new Error(`Fetch error: ${err.message || err}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Rulează un query SQL doar pentru citire (Oracle).
 * Apelează endpoint-ul /exec_query_oracle_RO și întoarce un array de rânduri.
 */
export async function runReadQueryORACLE(query) {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/exec_query_oracle_RO`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Unknown SQL read error");
    }

    const rawData = await res.text();
    const rows = rawData
      .split("\n")
      .map(row => row.split("\t"))
      .filter(row => row.some(val => val !== null && val !== "")); // elimină rândurile goale

    return rows;

  } catch (err) {
    console.error("Read query error:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}
