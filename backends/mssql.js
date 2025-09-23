const API_BASE = "http://localhost:5151";

/**
 * Face un fetch cu timeout configurabil.
 * Dacă timpul depășește limita, request-ul este anulat.
 */
/**
 * Fetch cu timeout configurabil.
 * Aruncă eroare clară dacă depășește timpul sau dacă fetch eșuează.
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
 * Rulează un query SQL doar pentru citire (SELECT).
 * Apelează endpoint-ul /exec_query_mssql_RO și întoarce un array de rânduri.
 */
export async function runReadQuery(query) {
    try {
       // console.log(query);

        const res = await fetchWithTimeout(`${API_BASE}/exec_query_mssql_RO`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: query,
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "Unknown SQL read error");
        }

        const rawData = await res.text();
        const rows = rawData.split("\n").map(row => row.split("\t"));

        return rows;

    } catch (err) {
        console.error("Read query error:", err);
        throw err;
    }
}

/**
 * Rulează un query SQL care modifică datele (INSERT, UPDATE, DELETE).
 * Apelează endpoint-ul /exec_query_mssql_RW și întoarce mesajul + nr. de rânduri afectate.
 */
export async function runWriteQuery(query) {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/exec_query_mssql_RW`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: query,
        });

        const data = await res.text();

        if (!res.ok) {
            throw new Error(data || "Unknown SQL write error");
        }

        const messageParts = data.split("affected_rows: ");
        const message = messageParts[0];
        const affectedRows = messageParts[1] ? parseInt(messageParts[1]) : 0;

      // console.log(`${message} affected_rows: ${affectedRows}`);

        return {
            message: message,
            affected_rows: affectedRows,
        };
    } catch (err) {
        console.error("Write query error:", err);
        alert(err);
        throw err;
    }
}
