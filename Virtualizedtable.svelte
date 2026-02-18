<script>
    // ─── Props ────────────────────────────────────────────────────────────────
    let {
        data = [], // [[header,...], [row,...], ...]
        rowHeight = 28,
        containerHeight = 400,
        overscan = 5,
        rowBorderBottom = true,
        cellBorderRight = true,
        rowdblclick = false,
        selectable = $bindable(false),
        selectedRows = $bindable([]), // exposes selected raw row arrays
        onRowDblClicked = () => {},
        fitData = false,
    } = $props();

    // ─── DOM refs ─────────────────────────────────────────────────────────────
    let containerRef = $state(null);
    let headerRef = $state(null);

    // ─── Scroll ───────────────────────────────────────────────────────────────
    let scrollTop = $state(0);
    let scrollLeft = $state(0);
    let headerRowHeight = $state(0);
    let controlsRowHeight = $state(0);

    function handleScroll(e) {
        scrollTop = e.target.scrollTop;
        scrollLeft = e.target.scrollLeft;
        if (headerRef) headerRef.scrollLeft = scrollLeft;
    }

    // ─── Parsed data (zero allocation) ───────────────────────────────────────
    // headers  : data[0]  — string[]
    // rows     : data.slice(1) — raw sub-arrays, no object conversion
    const headers = $derived(data.length ? data[0] : []);
    const rows = $derived(data.length > 1 ? data.slice(1) : []);
    const colCount = $derived(headers.length);

    // ─── Column widths ────────────────────────────────────────────────────────
    // Measure up to 200 rows; result is array of px strings indexed by col.
    function measureWidth(colIdx) {
        let max = String(headers[colIdx] ?? "").length;
        if (fitData) {
            const limit = Math.min(data.length, 501);
            for (let r = 1; r < limit; r++) {
                const len = String(data[r][colIdx] ?? "").length;
                if (len > max) max = len;
            }
        }
        return Math.min(350, Math.max(80, max * 7.1 + 24));
    }

    const colWidths = $derived.by(() =>
        headers.map((_, i) => `${measureWidth(i)}px`),
    );

    $inspect(`colWidths`, new Date());

    const totalWidth = $derived(
        colWidths.reduce((s, w) => s + parseFloat(w), 0),
    );

    // ─── Filtering ────────────────────────────────────────────────────────────
    let filterValues = $state({}); // colIdx → raw string

    const activeFilters = $derived(
        Object.entries(filterValues)
            .map(([k, v]) => [Number(k), v.toLowerCase()])
            .filter(([, v]) => v.trim()),
    );

    const filteredRows = $derived.by(() => {
        if (!activeFilters.length) return rows;
        return rows.filter((row) =>
            activeFilters.every(([ci, val]) =>
                String(row[ci] ?? "")
                    .toLowerCase()
                    .includes(val),
            ),
        );
    });

    $inspect(`filteredRows`, new Date());
    let filterTimers = {};
    function onFilterInput(colIdx, e) {
        clearTimeout(filterTimers[colIdx]);
        filterTimers[colIdx] = setTimeout(() => {
            filterValues = { ...filterValues, [colIdx]: e.target.value };
        }, 250);
    }

    // ─── Sorting ──────────────────────────────────────────────────────────────
    let sortCol = $state(null); // colIdx | null
    let sortDir = $state("asc"); // "asc" | "desc"

    function toggleSort(colIdx) {
        if (sortCol === colIdx) {
            sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
            sortCol = colIdx;
            sortDir = "asc";
        }
    }

    const processedRows = $derived.by(() => {
        if (sortCol === null) return filteredRows;

        let numeric = true;
        const limit = Math.min(filteredRows.length, 100);
        for (let i = 0; i < limit; i++) {
            const v = filteredRows[i][sortCol];
            if (v !== "" && v !== null && v !== undefined && isNaN(Number(v))) {
                numeric = false;
                break;
            }
        }

        return [...filteredRows].sort((a, b) => {
            const av = a[sortCol],
                bv = b[sortCol];
            let diff;
            if (numeric) {
                diff = Number(av ?? 0) - Number(bv ?? 0);
            } else {
                const as = String(av ?? "").toLowerCase();
                const bs = String(bv ?? "").toLowerCase();
                diff = as < bs ? -1 : as > bs ? 1 : 0;
            }
            return sortDir === "asc" ? diff : -diff;
        });
    });

    $inspect(`processedRows`, new Date());

    // ─── Virtualization ───────────────────────────────────────────────────────
    const totalHeight = $derived(processedRows.length * rowHeight);
    const startIdx = $derived(
        Math.max(0, Math.floor(scrollTop / rowHeight) - overscan),
    );
    const endIdx = $derived(
        Math.min(
            processedRows.length,
            startIdx + Math.ceil(containerHeight / rowHeight) + overscan * 2,
        ),
    );
    const visibleRows = $derived(processedRows.slice(startIdx, endIdx));
    const offsetY = $derived(startIdx * rowHeight);

    $inspect(`visibleRows`, new Date());
    // ─── Row checkbox selection ───────────────────────────────────────────────
    // Track by row reference (the raw sub-array) — O(1) Set operations.
    let selectedSet = $state(new Set());

    $effect(() => {
        selectedRows = rows.filter((r) => selectedSet.has(r));
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

    // ─── Cell range selection ─────────────────────────────────────────────────
    // r1/r2 are absolute indices into processedRows.
    // c1/c2 are data column indices (0-based, ignoring checkbox col).
    let sel = $state(null); // { r1, c1, r2, c2 }
    let selecting = $state(false);
    let focusedCell = $state(null); // { r, c } — data col index

    const selBounds = $derived.by(() => {
        if (!sel) return null;
        return {
            r1: Math.min(sel.r1, sel.r2),
            r2: Math.max(sel.r1, sel.r2),
            c1: Math.min(sel.c1, sel.c2),
            c2: Math.max(sel.c1, sel.c2),
        };
    });

    function isCellSelected(absRow, dataCol) {
        if (!selBounds) return false;
        const { r1, r2, c1, c2 } = selBounds;
        return absRow >= r1 && absRow <= r2 && dataCol >= c1 && dataCol <= c2;
    }

    function onCellMouseDown(e, ri, dataCol) {
        const absRow = startIdx + ri;
        selecting = true;
        sel = { r1: absRow, c1: dataCol, r2: absRow, c2: dataCol };
        focusedCell = { r: absRow, c: dataCol };
        mousePos = { x: e.clientX, y: e.clientY };
        triggerAutoScroll();
    }

    let lastThrottle = 0;
    function onCellMouseMove(e, ri, dataCol) {
        if (!selecting) return;
        const now = Date.now();
        if (now - lastThrottle < 50) return;
        lastThrottle = now;
        sel = { ...sel, r2: startIdx + ri, c2: dataCol };
        mousePos = { x: e.clientX, y: e.clientY };
        triggerAutoScroll();
    }

    function endSelecting() {
        selecting = false;
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    // ─── Auto-scroll ──────────────────────────────────────────────────────────
    let mousePos = { x: 0, y: 0 };
    let rafId = null;
    const THRESHOLD = 50;

    function edgeSpeed(dist) {
        return 5 + (Math.max(0, THRESHOLD - Math.abs(dist)) / THRESHOLD) * 15;
    }

    function triggerAutoScroll() {
        if (!selecting || !containerRef) return;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            const rect = containerRef.getBoundingClientRect();
            let dirty = false;
            const maxC = colCount - 1;

            const top = mousePos.y - rect.top;
            const bot = rect.bottom - mousePos.y;
            if (top < THRESHOLD && containerRef.scrollTop > 0) {
                containerRef.scrollTop = Math.max(
                    0,
                    containerRef.scrollTop - edgeSpeed(top),
                );
                scrollTop = containerRef.scrollTop;
                sel = { ...sel, r2: Math.max(0, sel.r2 - 1) };
                dirty = true;
            } else if (
                bot < THRESHOLD &&
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
            if (left < THRESHOLD && containerRef.scrollLeft > 0) {
                containerRef.scrollLeft = Math.max(
                    0,
                    containerRef.scrollLeft - edgeSpeed(left),
                );
                scrollLeft = containerRef.scrollLeft;
                if (headerRef) headerRef.scrollLeft = scrollLeft;
                sel = { ...sel, c2: Math.max(0, sel.c2 - 1) };
                dirty = true;
            } else if (
                right < THRESHOLD &&
                containerRef.scrollLeft < totalWidth - containerRef.clientWidth
            ) {
                containerRef.scrollLeft = Math.min(
                    totalWidth - containerRef.clientWidth,
                    containerRef.scrollLeft + edgeSpeed(right),
                );
                scrollLeft = containerRef.scrollLeft;
                if (headerRef) headerRef.scrollLeft = scrollLeft;
                sel = { ...sel, c2: Math.min(maxC, sel.c2 + 1) };
                dirty = true;
            }

            if (selecting && dirty) triggerAutoScroll();
        });
    }

    // ─── Keyboard navigation ──────────────────────────────────────────────────
    function onKeyDown(e) {
        const active = e.target || document.activeElement;
        const inTable =
            containerRef?.contains(active) || headerRef?.contains(active);
        if (!inTable) return;

        const ctrl = e.ctrlKey || e.metaKey;

        if (ctrl && (e.key === "c" || e.key === "C")) {
            e.preventDefault();
            sel ? copySelection() : copyAll();
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
                c2: colCount - 1,
            };
            focusedCell = { r: 0, c: 0 };
            ensureVisible(0, 0);
            return;
        }
        if (ctrl && e.key === "End") {
            e.preventDefault();
            if (!processedRows.length) return;
            const r = processedRows.length - 1;
            const c = colCount - 1;
            focusedCell = { r, c };
            sel = { r1: r, c1: c, r2: r, c2: c };
            ensureVisible(r, c);
            return;
        }
        if (ctrl && e.key === "Home") {
            e.preventDefault();
            if (!processedRows.length) return;
            focusedCell = { r: 0, c: 0 };
            sel = { r1: 0, c1: 0, r2: 0, c2: 0 };
            ensureVisible(0, 0);
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
            // Ctrl+Arrow: jump to next data boundary (Excel behaviour)
            const dR = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
            const dC =
                e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
            const isEmpty = (rr, cc) => {
                const v = processedRows[rr]?.[cc];
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
                    nc >= colCount
                )
                    break;
                // if we started on data, stop at first empty; if we started empty, stop at first data
                if (isEmpty(nr, nc) !== startedEmpty) {
                    if (startedEmpty) {
                        r = nr;
                        c = nc;
                    } // land on the data cell
                    break;
                }
                r = nr;
                c = nc;
            }
        } else {
            if (e.key === "ArrowUp" && r > 0) r--;
            else if (e.key === "ArrowDown" && r < processedRows.length - 1) r++;
            else if (e.key === "ArrowLeft" && c > 0) c--;
            else if (e.key === "ArrowRight" && c < colCount - 1) c++;
        }

        focusedCell = { r, c };
        sel =
            e.shiftKey && sel
                ? { ...sel, r2: r, c2: c }
                : { r1: r, c1: c, r2: r, c2: c };
        ensureVisible(r, c);
    }

    function ensureVisible(absRow, dataCol) {
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
        for (let i = 0; i < dataCol; i++) cellLeft += parseFloat(colWidths[i]);
        const cellRight = cellLeft + parseFloat(colWidths[dataCol] ?? "80px");

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

    // ─── Clipboard ────────────────────────────────────────────────────────────
    let copied = $state(false);
    let copiedCount = $state(0);

    function writeClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => fallback(text));
        } else {
            fallback(text);
        }
    }

    function fallback(text) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand("copy");
        } catch {}
        document.body.removeChild(ta);
    }

    function flash(count) {
        copiedCount = count;
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }

    function copyAll(fmt = "tsv") {
        const sep = fmt === "csv" ? "," : "\t";
        const lines = [
            headers.join(sep),
            ...processedRows.map((r) => r.join(sep)),
        ];
        writeClipboard(lines.join("\n"));
        flash(processedRows.length);
    }

    function copySelection() {
        if (!selBounds) return;
        const { r1, r2, c1, c2 } = selBounds;
        const lines = [];
        for (let r = r1; r <= r2 && r < processedRows.length; r++) {
            const cells = [];
            for (let c = c1; c <= c2 && c < colCount; c++) {
                cells.push(processedRows[r][c] ?? "");
            }
            lines.push(cells.join("\t"));
        }
        writeClipboard(lines.join("\n"));
        flash(lines.length);
    }

    // ─── Double click ─────────────────────────────────────────────────────────
    let dblClickRow = $state(null);
    function onRowDblClick(row) {
        if (!rowdblclick) return;
        dblClickRow = row;
        onRowDblClicked(row);
    }

    // ─── CSS grid template string ─────────────────────────────────────────────
    const gridTemplate = $derived(
        selectable ? `60px ${colWidths.join(" ")}` : colWidths.join(" "),
    );

    let measuringWidths = $state(false);
    async function toggleFitData() {
        measuringWidths = true;
        await new Promise((r) => setTimeout(r, 400));
        fitData = !fitData;
        measuringWidths = false;
    }
</script>

<svelte:window onkeydown={onKeyDown} onmouseup={endSelecting} />

<div class="vt-wrap surface small-margin">
    <!-- Controls -->
    <div
        class="vt-controls row surface-dim small-padding"
        bind:clientHeight={controlsRowHeight}
    >
        <!-- svelte-ignore a11y_missing_attribute -->
        <a style="margin-right:  2.375rem;">
            <i>grid_on</i>
            <span class="secondary badge bottom right">
                {#if copied}
                    <div class="primary" role="alert ">
                        <i>done_all</i>
                    </div>
                {:else}
                    <span> {processedRows.length} </span>
                {/if}
            </span>
        </a>

        <button class="tertiary no-margin small" onclick={() => copyAll()}>
            Copy <i>table_rows_narrow</i>
        </button>

        {#if selectable && selectedSet.size > 0}
            <span class="small-padding">{selectedSet.size} selected</span>
        {/if}

        <div class="spacer"></div>

        <button class="small" onclick={() => copyAll("csv")}><i>csv</i></button>

        <button class="small transparent" onclick={toggleFitData}>
            <i
                >{measuringWidths
                    ? "hourglass_top"
                    : fitData
                      ? "width_normal"
                      : "width_wide"}</i
            >
        </button>
    </div>

    <!-- Header — outside scroll body, synced horizontally via JS -->
    <div
        class="vt-header-scroll primary"
        bind:this={headerRef}
        style="overflow:hidden;"
        bind:clientHeight={headerRowHeight}
    >
        <div class="vt-grid" style="grid-template-columns:{gridTemplate};">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            {#if selectable}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="vt-hcell vt-hcell-check" onclick={toggleSelectAll}>
                    <i class="small"
                        >{allVisibleSelected
                            ? "check_box"
                            : "check_box_outline_blank"}</i
                    >
                    <span style="font-size:0.5rem">{processedRows.length}</span>
                </div>
            {/if}

            {#each headers as header, ci}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="vt-hcell"
                    onclick={() => toggleSort(ci)}
                    aria-sort={sortCol === ci
                        ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                        : "none"}
                >
                    <div class="vt-hcell-top">
                        <span class="vt-hcell-label">{header}</span>
                        {#if sortCol === ci}
                            <span class="vt-sort"
                                >{sortDir === "asc" ? "▲" : "▼"}</span
                            >
                        {/if}
                    </div>
                    <input
                        class="vt-filter"
                        type="text"
                        placeholder="Filter…"
                        oninput={(e) => onFilterInput(ci, e)}
                        onclick={(e) => e.stopPropagation()}
                        aria-label="Filter {header}"
                    />
                </div>
            {/each}
        </div>
    </div>

    <!-- Scrollable body -->
    <div
        class="vt-body"
        bind:this={containerRef}
        style="height:{containerHeight -
            headerRowHeight -
            controlsRowHeight -
            10}px;"
        onscroll={handleScroll}
        role="grid"
        tabindex="0"
    >
        {#if processedRows.length > 0}
            <div style="height:{totalHeight}px; position:relative;">
                <div style="transform:translateY({offsetY}px);">
                    {#each visibleRows as row, ri}
                        {@const absRow = startIdx + ri}
                        <!-- svelte-ignore a11y_interactive_supports_focus -->
                        <div
                            class="vt-grid vt-row"
                            class:vt-row-border={rowBorderBottom}
                            class:vt-row-dbl={row === dblClickRow}
                            style="height:{rowHeight}px; grid-template-columns:{gridTemplate};"
                            role="row"
                            aria-rowindex={absRow + 1}
                            ondblclick={() => onRowDblClick(row)}
                        >
                            {#if selectable}
                                <div class="vt-cell vt-cell-check">
                                    <button
                                        class="transparent no-margin small-padding"
                                        onclick={() => toggleRow(row)}
                                    >
                                        <i class="large fill">
                                            {selectedSet.has(row)
                                                ? "check_box"
                                                : "check_box_outline_blank"}
                                        </i>
                                    </button>
                                </div>
                            {/if}

                            {#each headers as _, ci}
                                {@const isSelected = isCellSelected(absRow, ci)}
                                <div
                                    class="vt-cell"
                                    class:vt-cell-selected={isSelected}
                                    class:vt-cell-border={cellBorderRight}
                                    role="gridcell"
                                    tabindex={focusedCell?.r === absRow &&
                                    focusedCell?.c === ci
                                        ? 0
                                        : -1}
                                    onmousedown={(e) =>
                                        onCellMouseDown(e, ri, ci)}
                                    onmousemove={(e) =>
                                        onCellMouseMove(e, ri, ci)}
                                    onmouseup={endSelecting}
                                >
                                    {row[ci] ?? ""}
                                </div>
                            {/each}
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <div class="vt-empty">No data to display</div>
        {/if}
    </div>
</div>

<style>
    .vt-wrap {
        width: 99.5%;
        font-size: 1rem;
    }

    .vt-controls {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-bottom: 0.25rem;
        font-size: 0.75rem;
    }

    .vt-header-scroll {
        overflow: hidden;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    /* Shared grid — both header and rows use this */
    .vt-grid {
        display: grid;
        width: max-content;
        min-width: 100%;
    }

    /* Header cells */
    .vt-hcell {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.25rem 0.375rem;
        font-size: 0.6875rem;
        font-weight: 600;
        min-height: 3.2rem;
        border-right: 1.2px solid var(--outline);
        cursor: pointer;
        user-select: none;
        overflow: hidden;
    }

    .vt-hcell:last-child {
        border-right: none;
    }

    .vt-hcell-check {
        align-items: center;
        justify-content: center;
    }

    .vt-hcell-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--surface);
        padding-bottom: 0.1rem;
        min-height: 1.2rem;
    }

    .vt-hcell-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .vt-sort {
        font-size: 0.6rem;
        margin-left: 0.15rem;
        flex-shrink: 0;
    }

    .vt-filter {
        width: 100%;
        padding: 0.2rem 0.3rem;
        border: 0.0625rem solid var(--outline);
        border-radius: 0.2rem;
        font-size: 0.6rem;
        font-family: inherit;
        background: var(--surface);
        color: var(--on-surface);
    }

    .vt-filter:focus {
        outline: 0.125rem solid var(--primary);
        outline-offset: -0.0625rem;
    }

    /* Body */
    .vt-body {
        overflow: auto;
        font-family: inherit;
        border-bottom: 2px solid var(--surface-dim);
    }

    .vt-row {
        align-items: stretch;
    }

    .vt-row-border {
        border-bottom: 1px solid var(--tertiary);
    }

    .vt-row-dbl {
        background: var(--tertiary-container);
    }

    /* Data cells */
    .vt-cell {
        padding: 0.25rem 0.375rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        user-select: none;
    }

    .vt-cell-check {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .vt-cell-border {
        border-right: 1px solid var(--tertiary);
    }

    .vt-cell-selected {
        background-color: var(--secondary-container);
        color: var(--on-secondary-container);
    }

    .vt-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 6rem;
        color: #888;
        font-size: 0.75rem;
        font-style: italic;
    }
</style>


