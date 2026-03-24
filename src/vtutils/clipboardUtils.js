/**
 * clipboardUtils.js
 * Clipboard utilities for VirtualTable.
 * No Svelte dependency — fully unit-testable.
 */

/**
 * Write text to the clipboard, falling back to execCommand for older browsers.
 * @param {string} text
 */
export function writeClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => clipboardFallback(text));
    } else {
        clipboardFallback(text);
    }
}

/**
 * execCommand-based clipboard fallback for environments without navigator.clipboard.
 * @param {string} text
 */
function clipboardFallback(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch { }
    document.body.removeChild(ta);
}

/**
 * Copy the full visible table (all processed rows) to the clipboard.
 *
 * @param {any[][]}  processedRows
 * @param {number[]} visibleColIndices
 * @param {string[]} headers
 * @param {"tsv"|"csv"} [fmt="tsv"]
 */
export function copyAll(processedRows, visibleColIndices, headers, fmt = "tsv") {
    const sep = fmt === "csv" ? "," : "\t";
    const visHeaders = visibleColIndices.map(i => headers[i]);
    const lines = [
        visHeaders.join(sep),
        ...processedRows.map(r => visibleColIndices.map(i => r[i] ?? "").join(sep))
    ];
    writeClipboard(lines.join("\n"));
}

/**
 * Copy the currently selected cell range to the clipboard as TSV.
 *
 * @param {any[][]}  processedRows
 * @param {number[]} visibleColIndices
 * @param {{ r1:number, r2:number, c1:number, c2:number } | null} selBounds
 * @param {number}   visibleCount
 */
export function copySelection(processedRows, visibleColIndices, selBounds, visibleCount) {
    if (!selBounds) return;
    const { r1, r2, c1, c2 } = selBounds;
    const lines = [];
    for (let r = r1; r <= r2 && r < processedRows.length; r++) {
        const cells = [];
        for (let vp = c1; vp <= c2 && vp < visibleCount; vp++) {
            cells.push(processedRows[r][visibleColIndices[vp]] ?? "");
        }
        lines.push(cells.join("\t"));
    }
    writeClipboard(lines.join("\n"));
}
