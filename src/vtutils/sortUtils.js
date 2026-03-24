// src/vtutils/sortUtils.js

/**
 * Detectează dacă o coloană este numerică (pe baza primelor N valori)
 */
export function detectNumeric(rows, ci, limit = 50) {
    let hasValue = false;

    for (let i = 0; i < Math.min(rows.length, limit); i++) {
        const v = rows[i][ci];

        if (v !== "" && v !== null && v !== undefined) {
            hasValue = true;
            if (isNaN(Number(v))) return false;
        }
    }

    return hasValue;
}

/**
 * Detectare numerică bazată pe rows deja filtrate (mai rapid pentru sort)
 */
export function isColumnNumeric(inputRows, col, limit = 100) {
    for (let i = 0; i < Math.min(inputRows.length, limit); i++) {
        const v = inputRows[i][col];

        if (v !== "" && v !== null && v !== undefined && isNaN(Number(v))) {
            return false;
        }
    }

    return true;
}

/**
 * Sortează rândurile după coloană
 */
export function sortRowsBy(inputRows, col, dir = "asc") {
    if (col === null) return inputRows;

    const numeric = isColumnNumeric(inputRows, col);

    return [...inputRows].sort((a, b) => {
        const av = a[col];
        const bv = b[col];

        const aEmpty = av === null || av === undefined || av === "";
        const bEmpty = bv === null || bv === undefined || bv === "";

        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return dir === "asc" ? 1 : -1;
        if (bEmpty) return dir === "asc" ? -1 : 1;

        const res = numeric
            ? Number(av) - Number(bv)
            : String(av).localeCompare(String(bv));

        return dir === "asc" ? res : -res;
    });
}