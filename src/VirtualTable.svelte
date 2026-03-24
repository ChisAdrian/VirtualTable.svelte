<script>
    import { tick, onDestroy } from "svelte";
    import "./VirtualTable.css";

    import { detectNumeric, sortRowsBy } from "./vtutils/sortUtils";
    import { matchFilter } from "./vtutils/filterUtils";

    import { copyAll, copySelection } from "./vtutils/clipboardUtils";
    // ── Public API ────────────────────────────────────────────────────────────

    /** Set filters programmatically. Accepts Map<colIdx, {op, value}> or plain object. */
    export function setFilters(v) {
        const map =
            v instanceof Map
                ? v
                : new Map(Object.entries(v).map(([k, v]) => [Number(k), v]));
        filterInputs = new Map(map); // copy — don't share reference
        filterValues = new Map(map);
    }

    /** Clear all filters. */
    export function clearFilters() {
        filterInputs = new Map();
        filterValues = new Map();
    }

    /** Return a copy of the currently applied filter map. */
    export function getFilters() {
        return new Map(filterValues);
    }

    /** Clear sort state and re-expose the filtered (unsorted) rows. */
    export function clearSort() {
        sortCol = null;
        sortDir = "asc";
        processedRows = filteredRows.slice();
    }

    // ── Props ─────────────────────────────────────────────────────────────────

    /**
     * data  — 2-D array, row 0 = header labels, rows 1-N = data.
     *
     * rowHeight        — px height of each body row (default 28).
     * containerHeight  — total component height in px (default 400).
     * overscan         — extra rows rendered beyond the viewport (default 5).
     *
     * rowBorderBottom / cellBorderRight — visual grid lines.
     *
     * selectable      — show checkbox column; bind to toggle.
     * selectedRows    — bindable array of selected row arrays.
     *
     * cellDblclick      — enable dblclick callback.
     * onCellDblClick    — (e, row, colIdx) => void
     * cellContextMenu   — enable context-menu callback.
     * onCellContextMenu — (rowData, e, colIdx) => void
     *
     * fitData         — fit column widths to content.
     * resizeKey       — localStorage key for persisting column widths.
     *
     * editableCols    — { colIdx: "text"|"number" }
     * onCellEdit      — (row, colIdx, event) => void   ← renamed from onhandleCellEdit
     * snippets        — { colName: (value, row) => Snippet }
     *
     * externalFilters — { colIdx: { hidden?: bool, ... } } — hide/lock columns.
     * showFilterOps   — bindable; show/hide operator dropdowns.
     * savingCell      — { rowId, ci } | null — marks a cell as saving.
     *
     * filterMode      — "live" | "manual" (default "manual").
     *
     * highlightCol    — column name whose truthy value highlights the row.
     * rowClass        — (row) => string — dynamic CSS class per row.
     * emptyMessage    — shown when no rows match.
     * onRowClick      — (row) => void
     *
     * extraFilters    — [["ColName", op, value], ...] programmatic row filters.
     *                   Supports ops: = != > >= < <= contains starts ends
     * filterRowIds    — string[] | null — whitelist of row[0] values to show.
     */
    let {
        data = [],
        rowHeight = 28,
        containerHeight = 400,
        overscan = 5,

        rowBorderBottom = true,
        cellBorderRight = true,

        selectable = $bindable(false),
        selectedRows = $bindable([]),

        cellDblclick = false,
        onCellDblClick = () => {},

        fitData = false,
        cellContextMenu = false,
        onCellContextMenu = () => {},
        resizeKey = null,

        editableCols = {},
        onCellEdit = () => {}, // was: onhandleCellEdit
        snippets = {},
        externalFilters = {},
        showFilterOps = $bindable(false), // was: advancedFiltershow
        savingCell = null,

        filterMode = "manual",

        highlightCol = null,
        rowClass = null,
        emptyMessage = "No data to display",
        onRowClick = () => {},

        extraFilters = [],
        filterRowIds = null,
    } = $props();

    // ── DOM refs ──────────────────────────────────────────────────────────────

    let containerRef = $state(null);
    let headerRef = $state(null);
    let wrapRef = $state(null);

    // ── Scroll state ──────────────────────────────────────────────────────────

    let scrollTop = $state(0);
    let scrollLeft = $state(0);
    let headerRowHeight = $state(0);
    let controlsRowHeight = $state(0);

    const bodyHeight = $derived(
        Math.max(0, containerHeight - headerRowHeight - controlsRowHeight),
    );

    let scrollRaf = null;
    function handleScroll() {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => {
            scrollTop = containerRef.scrollTop;
            scrollLeft = containerRef.scrollLeft;
            if (headerRef) headerRef.scrollLeft = scrollLeft;
            scrollRaf = null;
        });
    }

    // ── Parsed data ───────────────────────────────────────────────────────────

    const headers = $derived(data.length ? data[0] : []);
    const rows = $derived(data.length > 1 ? data.slice(1) : []);

    // ── Visible columns ───────────────────────────────────────────────────────

    const visibleColIndices = $derived(
        headers.map((_, i) => i).filter((i) => !externalFilters[i]?.hidden),
    );
    const visibleCount = $derived(visibleColIndices.length);

    // ── Highlight column ──────────────────────────────────────────────────────

    const highlightColIdx = $derived(
        highlightCol ? headers.indexOf(highlightCol) : -1,
    );

    // ── Numeric column detection ($derived — not $state + $effect) ────────────

    /** Returns true if the first ≤50 non-empty values in column ci are all numeric. */

    // Proper $derived — recalculates reactively, no $effect side-effect pattern.
    const colNumericCache = $derived(
        headers.length ? headers.map((_, i) => detectNumeric(rows, i)) : [],
    );
    // ── Column widths ─────────────────────────────────────────────────────────

    /** Widths stored as numbers (px) internally; stringified only at boundaries. */
    let colWidths = $state([]); // number[]
    let scrollbarWidth = $state(0);

    function measureWidth(colIdx) {
        let max = String(headers[colIdx] ?? "").length;
        if (fitData) {
            const limit = Math.min(data.length, 501);
            for (let r = 1; r < limit; r++) {
                const len = String(data[r][colIdx] ?? "").length;
                if (len > max) max = len;
            }
        }
        return Math.min(350, Math.max(80, max * 7.2 + 24));
    }

    $effect(() => {
        // Depend on headers & fitData; recompute fresh widths.
        const fresh = headers.map((_, i) => measureWidth(i)); // number[]
        if (resizeKey) {
            try {
                const stored = localStorage.getItem(resizeKey);
                const parsed = stored ? JSON.parse(stored) : null;
                // Accept stored if same column count and all numeric
                if (
                    Array.isArray(parsed) &&
                    parsed.length === headers.length &&
                    parsed.every((v) => typeof v === "number")
                ) {
                    colWidths = parsed;
                } else {
                    colWidths = fresh;
                }
            } catch {
                colWidths = fresh;
            }
        } else {
            colWidths = fresh;
        }
    });

    $effect(() => {
        if (!containerRef) return;
        scrollbarWidth = containerRef.offsetWidth - containerRef.clientWidth;
    });

    // CSS custom props and grid helpers — use number widths, format here only.
    const columnVars = $derived(
        colWidths.map((w, i) => `--col-${i}-w: ${w}px`).join("; "),
    );
    const totalWidth = $derived(colWidths.reduce((s, w) => s + w, 0));
    const gridTemplate = $derived(
        (selectable ? "60px " : "") +
            visibleColIndices.map((i) => `${colWidths[i] ?? 80}px`).join(" "),
    );

    // ── Filtering ─────────────────────────────────────────────────────────────
    // filterInputs — what the user has typed (pending in "manual" mode)
    // filterValues — applied values; drives filteredRows

    let filterInputs = $state(new Map()); // Map<colIdx, {op: string, value: string}>
    let filterValues = $state(new Map());
    let filterTimers = {};

    onDestroy(() => Object.values(filterTimers).forEach(clearTimeout));

    function applyFilters() {
        filterValues = new Map(filterInputs);
    }

    const activeFilters = $derived(
        [...filterValues.entries()].filter(([, v]) =>
            v?.value?.toString().trim(),
        ),
    );

    // extraFilters resolved to column indices
    const extraFiltersResolved = $derived(
        extraFilters
            .map(([col, op, val]) => [headers.indexOf(col), op, val])
            .filter(([ci]) => ci !== -1),
    );

    const filterRowIdsSet = $derived(
        filterRowIds ? new Set(filterRowIds) : null,
    );

    const filteredRows = $derived.by(() => {
        return rows.filter((row) => {
            // 0. filterRowIds whitelist
            if (filterRowIdsSet && !filterRowIdsSet.has(row[0])) return false;

            // 1. extraFilters — same matchFilter used here for consistency
            for (const [ci, op, val] of extraFiltersResolved) {
                if (!matchFilter(row[ci], { op, value: val })) return false;
            }

            // 2. UI filters
            if (!activeFilters.length) return true;
            return activeFilters.every(([ci, filter]) =>
                matchFilter(row[ci], filter),
            );
        });
    });

    function onFilterInput(colIdx, value) {
        if (filterTimers[colIdx]) clearTimeout(filterTimers[colIdx]);
        filterTimers[colIdx] = setTimeout(
            () => {
                // Default op is always "contains" regardless of column type.
                const current = filterInputs.get(colIdx) ?? {
                    op: "contains",
                    value: "",
                };
                filterInputs = new Map(filterInputs).set(colIdx, {
                    ...current,
                    value,
                });
                delete filterTimers[colIdx];
                if (filterMode === "live") applyFilters();
            },
            filterMode === "live" ? 250 : 0,
        );
    }

    function setFilterOp(colIdx, op) {
        const prev = filterInputs.get(colIdx) ?? { value: "", op: "contains" };
        filterInputs = new Map(filterInputs).set(colIdx, { ...prev, op });
        if (filterMode === "live") applyFilters();
    }

    function clearColumnFilter(colIdx) {
        const next = new Map(filterInputs);
        next.delete(colIdx);
        filterInputs = next;
        filterValues = new Map(next);
    }

    // ── Sorting ───────────────────────────────────────────────────────────────

    let sortCol = $state(null);
    let sortDir = $state("asc");
    let sortPending = $state(null);
    let didResize = $state(false);

    // processedRows is $state so cell edits don't trigger re-sort.
    // It is synced from filteredRows via $effect; sort is preserved across filter
    // changes — only new data resets it.
    let processedRows = $state([]);
    let lastDataRef = null; // track data identity to know when to reset sort

    $effect(() => {
        const dataChanged = data !== lastDataRef;
        lastDataRef = data;

        if (dataChanged) {
            // Reset sort only on new dataset
            sortCol = null;
            sortDir = "asc";
            processedRows = filteredRows.slice();
        } else {
            // Preserve sort across filter changes
            processedRows = sortRowsBy(filteredRows.slice(), sortCol, sortDir);
        }
    });

    async function toggleSort(colIdx) {
        if (didResize) {
            didResize = false;
            return;
        }
        sortPending = colIdx;
        await new Promise((r) => setTimeout(r, 40));
        if (sortCol === colIdx) {
            sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
            sortCol = colIdx;
            sortDir = "asc";
        }
        processedRows = sortRowsBy(processedRows, sortCol, sortDir);
        sortPending = null;
    }

    // ── Processing overlay ────────────────────────────────────────────────────
    // Only shown when data reference genuinely changes (not on filter/sort).

    let processing = $state(false);
    $effect(() => {
        // Touch data to subscribe; the lastDataRef check avoids false positives.
        if (data !== lastDataRef && data.length > 0) {
            processing = true;
            setTimeout(() => {
                processing = false;
            }, 60);
        }
    });

    // ── Virtualization ────────────────────────────────────────────────────────

    const totalHeight = $derived(processedRows.length * rowHeight);
    const startIdx = $derived(
        Math.max(0, Math.floor(scrollTop / rowHeight) - overscan),
    );
    const endIdx = $derived(
        Math.min(
            processedRows.length,
            startIdx + Math.ceil(bodyHeight / rowHeight) + overscan * 2,
        ),
    );
    const visibleRows = $derived(processedRows.slice(startIdx, endIdx));
    const offsetY = $derived(startIdx * rowHeight);

    // ── Row checkbox selection ─────────────────────────────────────────────────

    let selectedSet = $state(new Set());

    $effect(() => {
        selectedRows = rows.filter((r) => selectedSet.has(r));
    });
    $effect(() => {
        data;
        selectedSet = new Set();
    });
    $effect(() => {
        activeFilters;
        selectedSet = new Set();
    });

    function toggleRow(row) {
        const next = new Set(selectedSet);
        next.has(row) ? next.delete(row) : next.add(row);
        selectedSet = next;
    }

    function toggleSelectAll() {
        selectedSet = allVisibleSelected ? new Set() : new Set(processedRows);
    }

    const allVisibleSelected = $derived(
        processedRows.length > 0 &&
            processedRows.every((r) => selectedSet.has(r)),
    );

    // ── Cell range selection ──────────────────────────────────────────────────

    let sel = $state(null);
    let selecting = $state(false);
    let focusedCell = $state(null);

    const selBounds = $derived.by(() => {
        if (!sel) return null;
        return {
            r1: Math.min(sel.r1, sel.r2),
            r2: Math.max(sel.r1, sel.r2),
            c1: Math.min(sel.c1, sel.c2),
            c2: Math.max(sel.c1, sel.c2),
        };
    });

    function isCellSelected(absRow, visPos) {
        if (!selBounds) return false;
        const { r1, r2, c1, c2 } = selBounds;
        return absRow >= r1 && absRow <= r2 && visPos >= c1 && visPos <= c2;
    }

    function onCellMouseDown(e, ri, visPos) {
        const absRow = startIdx + ri;
        selecting = true;
        sel = { r1: absRow, c1: visPos, r2: absRow, c2: visPos };
        focusedCell = { r: absRow, c: visPos };
        mousePos = { x: e.clientX, y: e.clientY };
        triggerAutoScroll();
    }

    let lastThrottle = 0;
    function onCellMouseMove(e, ri, visPos) {
        if (!selecting) return;
        const now = Date.now();
        if (now - lastThrottle < 50) return;
        lastThrottle = now;
        sel = { ...sel, r2: startIdx + ri, c2: visPos };
        mousePos = { x: e.clientX, y: e.clientY };
        triggerAutoScroll();
    }

    function endSelecting() {
        selecting = false;
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    // ── Auto-scroll during drag ───────────────────────────────────────────────

    let mousePos = { x: 0, y: 0 };
    let rafId = null;
    const EDGE = 50;

    function edgeSpeed(dist) {
        return 5 + (Math.max(0, EDGE - Math.abs(dist)) / EDGE) * 15;
    }

    function triggerAutoScroll() {
        if (!selecting || !containerRef) return;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            const rect = containerRef.getBoundingClientRect();
            let dirty = false;

            const top = mousePos.y - rect.top;
            const bot = rect.bottom - mousePos.y;
            if (top < EDGE && containerRef.scrollTop > 0) {
                containerRef.scrollTop = Math.max(
                    0,
                    containerRef.scrollTop - edgeSpeed(top),
                );
                scrollTop = containerRef.scrollTop;
                sel = { ...sel, r2: Math.max(0, sel.r2 - 1) };
                dirty = true;
            } else if (
                bot < EDGE &&
                containerRef.scrollTop < totalHeight - containerRef.clientHeight
            ) {
                containerRef.scrollTop = Math.min(
                    totalHeight - containerRef.clientHeight,
                    containerRef.scrollTop + edgeSpeed(bot),
                );
                scrollTop = containerRef.scrollTop;
                sel = {
                    ...sel,
                    r2: Math.min(processedRows.length - 1, sel.r2 + 1),
                };
                dirty = true;
            }

            const left = mousePos.x - rect.left;
            const right = rect.right - mousePos.x;
            if (left < EDGE && containerRef.scrollLeft > 0) {
                containerRef.scrollLeft = Math.max(
                    0,
                    containerRef.scrollLeft - edgeSpeed(left),
                );
                scrollLeft = containerRef.scrollLeft;
                if (headerRef) headerRef.scrollLeft = scrollLeft;
                sel = { ...sel, c2: Math.max(0, sel.c2 - 1) };
                dirty = true;
            } else if (
                right < EDGE &&
                containerRef.scrollLeft < totalWidth - containerRef.clientWidth
            ) {
                containerRef.scrollLeft = Math.min(
                    totalWidth - containerRef.clientWidth,
                    containerRef.scrollLeft + edgeSpeed(right),
                );
                scrollLeft = containerRef.scrollLeft;
                if (headerRef) headerRef.scrollLeft = scrollLeft;
                sel = { ...sel, c2: Math.min(visibleCount - 1, sel.c2 + 1) };
                dirty = true;
            }

            if (selecting && dirty) triggerAutoScroll();
        });
    }

    // ── Keyboard navigation ───────────────────────────────────────────────────

    function onKeyDown(e) {
        const active = e.target || document.activeElement;
        const inTable = wrapRef?.contains(active);
        if (!inTable) return;

        const inInput =
            active.tagName === "INPUT" || active.tagName === "SELECT";
        if (inInput) return;

        const ctrl = e.ctrlKey || e.metaKey;

        if (ctrl && (e.key === "c" || e.key === "C")) {
            e.preventDefault();
            sel ? handleCopySelection() : handleCopyAll();
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            sel = null;
            focusedCell = null;
            selecting = false;
            cancelAnimationFrame(rafId);
            rafId = null;
            return;
        }
        if (ctrl && (e.key === "a" || e.key === "A")) {
            e.preventDefault();
            if (!processedRows.length) return;
            sel = {
                r1: 0,
                c1: 0,
                r2: processedRows.length - 1,
                c2: visibleCount - 1,
            };
            focusedCell = { r: 0, c: 0 };
            ensureVisible(0, 0);
            containerRef?.focus({ preventScroll: true });
            return;
        }
        if (ctrl && e.key === "End") {
            e.preventDefault();
            if (!processedRows.length) return;
            const r = processedRows.length - 1,
                c = visibleCount - 1;
            focusedCell = { r, c };
            sel = { r1: r, c1: c, r2: r, c2: c };
            ensureVisible(r, c);
            containerRef?.focus({ preventScroll: true });
            return;
        }
        if (ctrl && e.key === "Home") {
            e.preventDefault();
            if (!processedRows.length) return;
            focusedCell = { r: 0, c: 0 };
            sel = { r1: 0, c1: 0, r2: 0, c2: 0 };
            ensureVisible(0, 0);
            containerRef?.focus({ preventScroll: true });
            return;
        }

        if (
            !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
        )
            return;
        e.preventDefault();
        if (!processedRows.length) return;

        let { r, c } = focusedCell ?? { r: startIdx, c: 0 };

        if (ctrl) {
            const dR = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
            const dC =
                e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
            const isEmpty = (rr, vp) => {
                const v = processedRows[rr]?.[visibleColIndices[vp]];
                return v === null || v === undefined || v === "";
            };
            const startedEmpty = isEmpty(r, c);
            while (true) {
                const nr = r + dR,
                    nc = c + dC;
                if (
                    nr < 0 ||
                    nr >= processedRows.length ||
                    nc < 0 ||
                    nc >= visibleCount
                )
                    break;
                if (isEmpty(nr, nc) !== startedEmpty) {
                    if (startedEmpty) {
                        r = nr;
                        c = nc;
                    }
                    break;
                }
                r = nr;
                c = nc;
            }
        } else {
            if (e.key === "ArrowUp" && r > 0) r--;
            else if (e.key === "ArrowDown" && r < processedRows.length - 1) r++;
            else if (e.key === "ArrowLeft" && c > 0) c--;
            else if (e.key === "ArrowRight" && c < visibleCount - 1) c++;
        }

        focusedCell = { r, c };
        sel =
            e.shiftKey && sel
                ? { ...sel, r2: r, c2: c }
                : { r1: r, c1: c, r2: r, c2: c };
        ensureVisible(r, c);
        containerRef?.focus({ preventScroll: true });
    }

    function ensureVisible(absRow, visPos) {
        if (!containerRef) return;
        const top = absRow * rowHeight;
        const bot = top + rowHeight;
        if (top < scrollTop) {
            containerRef.scrollTop = top;
            scrollTop = top;
        } else if (bot > scrollTop + containerRef.clientHeight) {
            containerRef.scrollTop = bot - containerRef.clientHeight;
            scrollTop = containerRef.scrollTop;
        }

        const checkboxW = selectable ? 60 : 0;
        let cellLeft = checkboxW;
        for (let i = 0; i < visPos; i++)
            cellLeft += colWidths[visibleColIndices[i]] ?? 80;
        const cellRight =
            cellLeft + (colWidths[visibleColIndices[visPos]] ?? 80);

        if (cellLeft < scrollLeft) {
            containerRef.scrollLeft = cellLeft;
            scrollLeft = cellLeft;
            if (headerRef) headerRef.scrollLeft = cellLeft;
        } else if (cellRight > scrollLeft + containerRef.clientWidth) {
            containerRef.scrollLeft = cellRight - containerRef.clientWidth;
            scrollLeft = containerRef.scrollLeft;
            if (headerRef) headerRef.scrollLeft = scrollLeft;
        }
    }

    // ── Clipboard ─────────────────────────────────────────────────────────────

    let copied = $state(false);

    function flash() {
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }

    function handleCopyAll(fmt = "tsv") {
        // @ts-ignore
        copyAll(processedRows, visibleColIndices, headers, fmt);
        flash();
    }

    function handleCopySelection() {
        copySelection(
            processedRows,
            visibleColIndices,
            selBounds,
            visibleCount,
        );
        flash();
    }

    // ── Column resize ─────────────────────────────────────────────────────────

    function startResize(e, colIdx) {
        e.preventDefault();
        e.stopPropagation();
        didResize = false;
        const startX = e.clientX;
        const startW = colWidths[colIdx];

        function onMove(ev) {
            didResize = true;
            const newW = Math.max(40, startW + ev.clientX - startX);
            // Update CSS var directly for smooth live feedback (no full re-render)
            wrapRef?.style.setProperty(`--col-${colIdx}-w`, `${newW}px`);
        }

        function onUp() {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            // Commit final width back to state
            const raw = wrapRef?.style.getPropertyValue(`--col-${colIdx}-w`);
            const newW = raw ? parseFloat(raw) : startW;
            colWidths = colWidths.with(colIdx, newW);
            if (resizeKey)
                localStorage.setItem(resizeKey, JSON.stringify(colWidths));
        }

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }

    // ── Fit-data toggle ───────────────────────────────────────────────────────

    let measuringWidths = $state(false);

    async function toggleFitData() {
        if (resizeKey) localStorage.removeItem(resizeKey);
        measuringWidths = true;
        await new Promise((r) => setTimeout(r, 400));
        fitData = !fitData;
        await tick();
        if (resizeKey)
            localStorage.setItem(resizeKey, JSON.stringify(colWidths));
        measuringWidths = false;
    }
</script>

<svelte:window onkeydown={onKeyDown} onmouseup={endSelecting} />

<div class="vt-wrap" bind:this={wrapRef} style={columnVars}>
    {#if processing}
        <div class="vt-processing" role="status" aria-label="Processing data">
            <span>⟳ Processing…</span>
        </div>
    {/if}

    <!-- ── Controls ── -->
    <div class="vt-controls" bind:clientHeight={controlsRowHeight}>
        <!-- Left: row count + copy -->
        <div class="vt-controls-left">
            <div class="vt-badge-wrap" title="{processedRows.length} rows">
                <span class="vt-icon">⊞</span>
                <span class="vt-badge">
                    {#if copied}✓{:else}{processedRows.length}{/if}
                </span>
            </div>
            <button
                class="vt-btn"
                onclick={() => handleCopyAll()}
                title="Copy as TSV">TSV</button
            >
            <button
                class="vt-btn"
                onclick={() => handleCopyAll("csv")}
                title="Copy as CSV">CSV</button
            >
        </div>

        <!-- Right: filter controls + fit -->
        <div class="vt-controls-right">
            {#if filterMode === "manual"}
                <button
                    class="vt-btn"
                    onclick={applyFilters}
                    title="Apply filters (Enter)"
                >
                    ⏎
                </button>
            {/if}
            <button
                class="vt-btn"
                onclick={() => (showFilterOps = !showFilterOps)}
                title={showFilterOps
                    ? "Hide filter operators"
                    : "Show filter operators"}
                aria-pressed={showFilterOps}
            >
                {showFilterOps ? "⚙" : "⛭"}
            </button>
            <button
                class="vt-btn"
                onclick={clearFilters}
                title="Clear all filters">✕</button
            >
            <button
                class="vt-btn"
                onclick={toggleFitData}
                title={measuringWidths
                    ? "Calculating…"
                    : fitData
                      ? "Standard column widths"
                      : "Fit columns to content"}
            >
                {measuringWidths ? "⟳" : fitData ? "↔" : "⇔"}
            </button>
        </div>
    </div>

    <!-- ── Header ── -->
    <div
        class="vt-header-scroll"
        bind:this={headerRef}
        bind:clientHeight={headerRowHeight}
        style="overflow:hidden; padding-right:{scrollbarWidth}px;"
        role="rowgroup"
    >
        <div
            class="vt-grid"
            style="grid-template-columns:{gridTemplate};"
            role="row"
        >
            {#if selectable}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <!-- svelte-ignore a11y_interactive_supports_focus -->
                <div
                    class="vt-hcell vt-hcell-check"
                    role="columnheader"
                    aria-label="Select all rows"
                    onclick={toggleSelectAll}
                >
                    <span>{allVisibleSelected ? "☑" : "☐"}</span>
                    <span class="vt-select-count">{processedRows.length}</span>
                </div>
            {/if}

            {#each visibleColIndices as ci}
                {@const header = headers[ci]}
                {@const isExt = externalFilters.hasOwnProperty(ci)}
                {@const filterVal = filterInputs.get(ci)?.value ?? ""}
                {@const hasFilter = filterVal.trim().length > 0}

                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <!-- svelte-ignore a11y_interactive_supports_focus -->
                <div
                    class="vt-hcell"
                    class:vt-hcell-filtered={hasFilter}
                    role="columnheader"
                    aria-sort={sortCol === ci
                        ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                        : "none"}
                    onclick={() => toggleSort(ci)}
                >
                    <!-- Column label + sort indicator -->
                    <div class="vt-hcell-top">
                        <span class="vt-hcell-label" title={header}
                            >{header}</span
                        >
                        {#if sortPending === ci}
                            <span
                                class="vt-sort vt-sort-pending"
                                aria-hidden="true">⟳</span
                            >
                        {:else if sortCol === ci}
                            <span class="vt-sort" aria-hidden="true"
                                >{sortDir === "asc" ? "▲" : "▼"}</span
                            >
                        {/if}
                    </div>

                    <!-- Filter row -->
                    <div class="vt-filter-row">
                        <select
                            class="vt-filter-op"
                            class:vt-filter-op-hidden={!showFilterOps}
                            aria-label="{header} filter operator"
                            title={isExt
                                ? "System filter (locked)"
                                : "Filter operator"}
                            disabled={isExt}
                            value={filterInputs.get(ci)?.op ?? "contains"}
                            onchange={(e) =>
                                setFilterOp(ci, e.currentTarget.value)}
                            onclick={(e) => e.stopPropagation()}
                        >
                            <option value="contains">%_</option>
                            <option value="starts">|%</option>
                            <option value="ends">%|</option>
                            <option value="equals">=</option>
                            <option value="!=">≠</option>
                            {#if colNumericCache[ci]}
                                <option value=">">&gt;</option>
                                <option value="<">&lt;</option>
                                <option value=">=">&gt;=</option>
                                <option value="<=">&lt;=</option>
                            {/if}
                        </select>

                        <div class="vt-filter-input-wrap">
                            <input
                                class="vt-filter"
                                type="text"
                                placeholder="Filter…"
                                aria-label="{header} filter"
                                value={filterVal}
                                oninput={(e) =>
                                    onFilterInput(ci, e.currentTarget.value)}
                                onkeydown={(e) => {
                                    if (e.key === "Enter") applyFilters();
                                }}
                                onclick={(e) => e.stopPropagation()}
                                disabled={isExt}
                            />
                            {#if hasFilter && !isExt}
                                <button
                                    class="vt-filter-clear"
                                    aria-label="Clear {header} filter"
                                    title="Clear filter"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        clearColumnFilter(ci);
                                    }}
                                >
                                    ×
                                </button>
                            {/if}
                        </div>
                    </div>

                    <div
                        class="vt-resize-handle"
                        aria-hidden="true"
                        onmousedown={(e) => startResize(e, ci)}
                    ></div>
                </div>
            {/each}
        </div>
    </div>

    <!-- ── Body ── -->
    <div
        class="vt-body"
        bind:this={containerRef}
        style="height:{bodyHeight}px;"
        onscroll={handleScroll}
        role="grid"
        tabindex="0"
        aria-rowcount={processedRows.length}
        aria-colcount={visibleCount}
        aria-label="Data table"
        onmousedown={(e) => {
            if (e.target === containerRef) e.preventDefault();
        }}
    >
        {#if processedRows.length > 0}
            <!-- Spacer establishes full scroll height -->
            <div
                style="height:{totalHeight}px; position:relative;"
                role="rowgroup"
            >
                <div style="transform:translateY({offsetY}px);">
                    {#each visibleRows as row, ri (startIdx + ri)}
                        {@const absRow = startIdx + ri}
                        {@const isHighlight =
                            highlightColIdx !== -1 && row[highlightColIdx]}

                        <!-- svelte-ignore a11y_interactive_supports_focus -->
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <div
                            class="vt-grid vt-row {rowClass
                                ? rowClass(row)
                                : ''}"
                            class:vt-row-border={rowBorderBottom}
                            class:vt-row-highlight={isHighlight}
                            style="height:{rowHeight}px; grid-template-columns:{gridTemplate};"
                            role="row"
                            aria-rowindex={absRow + 1}
                            onclick={() => onRowClick(row)}
                        >
                            {#if selectable}
                                <div
                                    class="vt-cell vt-cell-check"
                                    role="gridcell"
                                >
                                    <button
                                        class="vt-btn vt-btn-check"
                                        aria-label={selectedSet.has(row)
                                            ? "Deselect row"
                                            : "Select row"}
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            toggleRow(row);
                                        }}
                                    >
                                        <span class="vt-icon-large"
                                            >{selectedSet.has(row)
                                                ? "☑"
                                                : "☐"}</span
                                        >
                                    </button>
                                </div>
                            {/if}

                            {#each visibleColIndices as ci, visPos}
                                {@const isSelected = isCellSelected(
                                    absRow,
                                    visPos,
                                )}
                                {@const editType = editableCols[ci]}

                                <div
                                    class="vt-cell"
                                    class:vt-cell-selected={isSelected}
                                    class:vt-cell-border={cellBorderRight}
                                    role="gridcell"
                                    aria-selected={isSelected}
                                    aria-colindex={visPos + 1}
                                    tabindex={focusedCell?.r === absRow &&
                                    focusedCell?.c === visPos
                                        ? 0
                                        : -1}
                                    onmousedown={(e) =>
                                        onCellMouseDown(e, ri, visPos)}
                                    onmousemove={(e) =>
                                        onCellMouseMove(e, ri, visPos)}
                                    onmouseup={endSelecting}
                                    ondblclick={(e) => {
                                        if (cellDblclick)
                                            onCellDblClick(e, row, ci);
                                    }}
                                    oncontextmenu={(e) => {
                                        if (!cellContextMenu) return;
                                        e.preventDefault();
                                        onCellContextMenu(row, e, ci);
                                    }}
                                >
                                    {#if editType}
                                        <input
                                            class="vt-cell-input"
                                            type={editType === "number"
                                                ? "number"
                                                : "text"}
                                            disabled={savingCell?.rowId ===
                                                row[0] && savingCell?.ci === ci}
                                            value={row[ci] ?? ""}
                                            aria-label="{headers[
                                                ci
                                            ]} cell editor"
                                            onchange={(e) => {
                                                row[ci] =
                                                    editType === "number"
                                                        ? e.currentTarget
                                                              .valueAsNumber
                                                        : e.currentTarget.value;
                                                onCellEdit(row, ci, e);
                                            }}
                                            onclick={(e) => e.stopPropagation()}
                                            onmousedown={(e) =>
                                                e.stopPropagation()}
                                        />
                                    {:else if typeof snippets[headers[ci]] === "function"}
                                        {@render snippets[headers[ci]](
                                            row[ci],
                                            row,
                                        )}
                                    {:else}
                                        {row[ci] ?? ""}
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <div class="vt-empty" role="status">{emptyMessage}</div>
        {/if}
    </div>
</div>
