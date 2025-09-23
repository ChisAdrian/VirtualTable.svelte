<script lang="ts">
    // --------------------------
    // Types
    // --------------------------
    interface ColumnDef {
        key: string;
        title: string;
        width: string;
        minWidth: string;
    }

    type DataRow = Record<string, any>;

    interface SortOrder {
        key: string;
        direction: "asc" | "desc";
    }

    interface CellPosition {
        row: number;
        col: number;
    }

    interface MousePosition {
        x: number;
        y: number;
    }

    // Props: Define component inputs with default values
    let {
        data = [] as (DataRow | any[])[], // Array of objects or 2D array (first row as headers)
        columns = [] as ColumnDef[], // Optional: if empty, derive from data[0] with dynamic widths
        rowHeight = 28, // Row height in pixels for compact layout
        containerHeight = 400, // Container height in pixels
        overscan = 5, // Number of extra rows to render above/below viewport
        headerOnly = false, // Calculate column widths based on headers only
    } = $props();

    // Reactive state: Manage component state with Svelte reactivity
    let containerRef = $state<any>(null); // Reference to the table container DOM element
    let scrollTop = $state<number>(0); // Vertical scroll position
    let scrollLeft = $state<number>(0); // Horizontal scroll position
    let filterQuery = $state<string>(""); // Search query for filtering data
    let sortOrder = $state<SortOrder | null>(null); // Current sort state: { key, direction } or null
    let selectionStart = $state<CellPosition | null>(null); // Start of selection: { row: number, col: number }
    let selectionEnd = $state<CellPosition | null>(null); // End of selection: { row: number, col: number }
    let isSelecting = $state<boolean>(false); // Tracks if selection is active
    let copied = $state<boolean>(false); // Shows copy confirmation
    let copiedRowsCount = $state<number>(0); // Number of rows copied
    let isResizing = $state<boolean>(false); // Tracks column resizing state
    let mousePosition = $state<MousePosition>({ x: 0, y: 0 }); // Mouse position for auto-scroll
    //let autoScrollRaf = $state<any>(null); // Animation frame ID for auto-scroll (typed any to preserve behavior)
    let autoScrollRaf = $state<number | null>(null);
    //let focusedCell = $state<CellPosition | null>({ row: 0, col: 0 }); // Tracks focused cell, initialized to avoid null errors
    let focusedCell = $state<{ row: number; col: number } | null>({
        row: 0,
        col: 0,
    });

    // Processed data and columns: Store transformed data and column definitions
    let processedData = $state<DataRow[]>([]);
    let processedColumns = $state<ColumnDef[]>([]);

    // Store custom column widths to persist across data updates
    let customWidths = $state<Record<string, string>>({}); // { columnKey: width }

    // Calculate column width based on the maximum string length in the column
    function calculateColumnWidth(values: unknown[]): string {
        if (!values || values.length === 0) return "100px"; // Default width for empty data
        const sampleSize = Math.min(values.length, 500); // Limit to 500 rows for performance
        const maxLength = Math.max(
            ...values
                .slice(0, sampleSize)
                .map((val) => String(val ?? "").length),
        );
        const pixelsPerChar = 7; // Pixels per character for compact font
        const padding = 24; // Padding for cell content
        const minWidth = 80; // Minimum column width
        const maxWidth = 350; // Maximum column width
        const calculatedWidth = Math.max(
            minWidth,
            Math.min(maxWidth, maxLength * pixelsPerChar + padding),
        );
        return `${calculatedWidth}px`;
    }

    // Process data and columns reactively when data or props change
    $effect(() => {
        if (data.length === 0) {
            processedData = [];
            processedColumns = columns;
            return;
        }

        let tempData: DataRow[], tempColumns: ColumnDef[], headers: string[];
        if (Array.isArray(data[0])) {
            // Handle 2D array input (first row as headers)
            headers = data[0] as string[];
            tempColumns =
                columns.length > 0
                    ? columns
                    : headers.map((header, index) => {
                          const valuesToMeasure = headerOnly
                              ? [header]
                              : (data as any[][])
                                    .slice(1)
                                    .map((row) => row[index])
                                    .concat([header]);
                          return {
                              key: header.toLowerCase(),
                              title: header,
                              width:
                                  customWidths[header.toLowerCase()] ||
                                  calculateColumnWidth(valuesToMeasure),
                              minWidth: "80px",
                          };
                      });
            tempData = (data as any[][]).slice(1).map((row) => {
                const rowObj: DataRow = {};
                headers.forEach((header, index) => {
                    rowObj[header.toLowerCase()] = row[index] ?? "";
                });
                return rowObj;
            });
        } else {
            // Handle array of objects
            tempData = data as DataRow[];
            tempColumns =
                columns.length > 0
                    ? columns
                    : Object.keys(data[0] || {}).map((key) => {
                          const valuesToMeasure = headerOnly
                              ? [key]
                              : (data as DataRow[])
                                    .map((row) => row[key])
                                    .concat([key]);
                          return {
                              key,
                              title: key.charAt(0).toUpperCase() + key.slice(1),
                              width:
                                  customWidths[key] ||
                                  calculateColumnWidth(valuesToMeasure),
                              minWidth: "80px",
                          };
                      });
            headers = tempColumns.map((col) => col.title);
        }

        // Apply filter to data
        const filteredData = filterQuery
            ? tempData.filter((row) =>
                  Object.values(row).some((val) =>
                      String(val ?? "")
                          .toLowerCase()
                          .includes(filterQuery.toLowerCase()),
                  ),
              )
            : tempData;

        // Apply single-column sorting
        if (sortOrder) {
            filteredData.sort((a, b) => {
                const aVal = String(a[sortOrder.key] ?? "").toLowerCase();
                const bVal = String(b[sortOrder.key] ?? "").toLowerCase();
                return sortOrder.direction === "asc"
                    ? aVal < bVal
                        ? -1
                        : aVal > bVal
                          ? 1
                          : 0
                    : aVal < bVal
                      ? 1
                      : aVal > bVal
                        ? -1
                        : 0;
            });
        }

        processedData = filteredData;
        processedColumns = tempColumns;
    });

    // Derived values for virtualization
    const visibleCount = $derived.by(() =>
        Math.ceil(containerHeight / rowHeight),
    ); // Number of visible rows
    const startIndex = $derived.by(() =>
        Math.max(0, Math.floor(scrollTop / rowHeight) - overscan),
    ); // Start index for visible data
    const endIndex = $derived.by(() =>
        Math.min(
            processedData.length,
            startIndex + visibleCount + overscan * 2,
        ),
    ); // End index for visible data
    const visibleData = $derived.by(() =>
        processedData.slice(startIndex, endIndex),
    ); // Subset of data to render
    const totalHeight = $derived.by(() => processedData.length * rowHeight); // Total table height
    const offsetY = $derived.by(() => startIndex * rowHeight); // Vertical offset for rendering
    const totalWidth = $derived.by(() =>
        processedColumns.reduce((sum, col) => sum + parseFloat(col.width), 0),
    ); // Total table width

    // Selection logic: Start a selection range
    function startSelection(rowIndex: number, colIndex: number): void {
        if (!isResizing && processedData.length > 0) {
            // Ensure valid row and column indices
            const row = Math.min(
                Math.max(startIndex + rowIndex, 0),
                processedData.length - 1,
            );
            const col = Math.min(
                Math.max(colIndex, 0),
                processedColumns.length - 1,
            );
            isSelecting = true;
            selectionStart = { row, col };
            selectionEnd = { ...selectionStart };
            focusedCell = { row, col }; // Sync focused cell
            triggerAutoScroll(); // Start auto-scrolling
        }
    }

    // Selection logic: Update selection range during mouse movement
    function updateSelection(
        event: MouseEvent,
        rowIndex: number,
        colIndex: number,
    ): void {
        if (isSelecting && processedData.length > 0) {
            // Ensure valid row and column indices
            const row = Math.min(
                Math.max(startIndex + rowIndex, 0),
                processedData.length - 1,
            );
            const col = Math.min(
                Math.max(colIndex, 0),
                processedColumns.length - 1,
            );
            selectionEnd = { row, col };
            mousePosition = { x: event.clientX, y: event.clientY }; // Update mouse position
            triggerAutoScroll(); // Update auto-scrolling
        }
    }

    // Throttle mousemove events to improve performance
    let lastCall = 0;
    const throttleDelay = 50; // Throttle delay in milliseconds
    function throttledUpdateSelection(
        event: MouseEvent,
        rowIndex: number,
        colIndex: number,
    ): void {
        const now = Date.now();
        if (now - lastCall >= throttleDelay) {
            updateSelection(event, rowIndex, colIndex);
            lastCall = now;
        }
    }

    // Selection logic: End selection and stop auto-scrolling
    function endSelection(): void {
        isSelecting = false;
        if (autoScrollRaf) {
            cancelAnimationFrame(autoScrollRaf);
            autoScrollRaf = null;
        }
    }

    // Auto-scroll logic: Parameters for smooth scrolling
    const baseScrollSpeed = 5; // Base scroll speed in pixels per frame
    const maxScrollSpeed = 20; // Maximum scroll speed in pixels per frame
    const scrollThreshold = 50; // Distance from edge to trigger scrolling

    // Auto-scroll logic: Scroll table when mouse is near edges during selection
    function triggerAutoScroll(): void {
        if (!isSelecting || !containerRef || !selectionEnd) return;

        cancelAnimationFrame(autoScrollRaf); // Cancel previous animation frame

        autoScrollRaf = requestAnimationFrame(() => {
            const rect = containerRef.getBoundingClientRect();
            let needsUpdate = false;

            // Calculate dynamic scroll speed based on mouse proximity to edge
            const getScrollSpeed = (distance: number, threshold: number) => {
                const proximity =
                    Math.max(0, threshold - Math.abs(distance)) / threshold;
                return (
                    baseScrollSpeed +
                    proximity * (maxScrollSpeed - baseScrollSpeed)
                );
            };

            // Vertical scrolling
            const topDistance = mousePosition.y - rect.top;
            const bottomDistance = rect.bottom - mousePosition.y;
            if (topDistance < scrollThreshold && containerRef.scrollTop > 0) {
                // Scroll up
                const speed = getScrollSpeed(topDistance, scrollThreshold);
                containerRef.scrollTop = Math.max(
                    0,
                    containerRef.scrollTop - speed,
                );
                scrollTop = containerRef.scrollTop;
                if (selectionEnd.row > 0) {
                    selectionEnd.row = Math.max(
                        0,
                        selectionEnd.row - Math.ceil(speed / rowHeight),
                    );
                }
                needsUpdate = true;
            } else if (
                bottomDistance < scrollThreshold &&
                scrollTop < totalHeight - containerRef.clientHeight
            ) {
                // Scroll down
                const speed = getScrollSpeed(bottomDistance, scrollThreshold);
                containerRef.scrollTop = Math.min(
                    totalHeight - containerRef.clientHeight,
                    containerRef.scrollTop + speed,
                );
                scrollTop = containerRef.scrollTop;
                if (selectionEnd.row < processedData.length - 1) {
                    selectionEnd.row = Math.min(
                        processedData.length - 1,
                        selectionEnd.row + Math.ceil(speed / rowHeight),
                    );
                }
                needsUpdate = true;
            }

            // Horizontal scrolling
            const leftDistance = mousePosition.x - rect.left;
            const rightDistance = rect.right - mousePosition.x;
            if (leftDistance < scrollThreshold && containerRef.scrollLeft > 0) {
                // Scroll left
                const speed = getScrollSpeed(leftDistance, scrollThreshold);
                containerRef.scrollLeft = Math.max(
                    0,
                    containerRef.scrollLeft - speed,
                );
                scrollLeft = containerRef.scrollLeft;
                if (selectionEnd.col > 0) {
                    selectionEnd.col = Math.max(0, selectionEnd.col - 1);
                }
                needsUpdate = true;
            } else if (
                rightDistance < scrollThreshold &&
                containerRef.scrollLeft < totalWidth - containerRef.clientWidth
            ) {
                // Scroll right
                const speed = getScrollSpeed(rightDistance, scrollThreshold);
                containerRef.scrollLeft = Math.min(
                    totalWidth - containerRef.clientWidth,
                    containerRef.scrollLeft + speed,
                );
                scrollLeft = containerRef.scrollLeft;
                if (selectionEnd.col < processedColumns.length - 1) {
                    selectionEnd.col = Math.min(
                        processedColumns.length - 1,
                        selectionEnd.col + 1,
                    );
                }
                needsUpdate = true;
            }

            // Continue auto-scrolling if still selecting and scrolling occurred
            if (isSelecting && needsUpdate) {
                triggerAutoScroll();
            }
        });
    }

    // Selection logic: Check if a cell is within the selection range
    const isCellSelected = $derived.by(() => {
        return (rowIndex: number, colIndex: number) => {
            if (!selectionStart || !selectionEnd) {
                return { isSelected: false, isStart: false };
            }
            const minRow = Math.min(selectionStart.row, selectionEnd.row);
            const maxRow = Math.max(selectionStart.row, selectionEnd.row);
            const minCol = Math.min(selectionStart.col, selectionEnd.col);
            const maxCol = Math.max(selectionStart.col, selectionEnd.col);
            const isSelected =
                rowIndex >= minRow &&
                rowIndex <= maxRow &&
                colIndex >= minCol &&
                colIndex <= maxCol;
            const isStart =
                rowIndex === selectionStart.row &&
                colIndex === selectionStart.col;
            return { isSelected, isStart };
        };
    });

    // Clipboard: Copy text to clipboard with modern API and fallback
    function copyToClipboard(text: string): void {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    // Clipboard: Fallback for older browsers
    function fallbackCopy(text: string): void {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand("copy");
        } catch (err) {
            console.error("Fallback copy failed:", err);
            alert("Failed to copy data. Please select and copy manually.");
        }
        document.body.removeChild(textarea);
    }

    // Clipboard: Show copy confirmation for 2 seconds
    function showCopied(count: number): void {
        copiedRowsCount = count;
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }

    // Clipboard: Copy all filtered data
    function copyFilteredData(format: "tsv" | "csv" = "tsv"): void {
        const headers = processedColumns.map((col) => col.title);
        const dataToCopy = processedData;
        const separator = format === "tsv" ? "\t" : ",";
        const textData = [
            headers.join(separator),
            ...dataToCopy.map((row) =>
                processedColumns
                    .map((col) => row[col.key] ?? "")
                    .join(separator),
            ),
        ].join("\n");
        copyToClipboard(textData);
        showCopied(dataToCopy.length);
    }

    // Clipboard: Copy selected range of cells
    function copySelectedRange(format: "tsv" | "csv" = "tsv"): void {
        if (!selectionStart || !selectionEnd) return;
        const minRow = Math.min(selectionStart.row, selectionEnd.row);
        const maxRow = Math.max(selectionStart.row, selectionEnd.row);
        const minCol = Math.min(selectionStart.col, selectionEnd.col);
        const maxCol = Math.max(selectionStart.col, selectionEnd.col);

        const selectedData: string[][] = [];
        for (let i = minRow; i <= maxRow && i < processedData.length; i++) {
            const rowSlice = processedColumns
                .slice(minCol, maxCol + 1)
                .map((col) => processedData[i][col.key] ?? "");
            selectedData.push(rowSlice);
        }
        const separator = format === "tsv" ? "\t" : ",";
        const textData = selectedData
            .map((row) => row.join(separator))
            .join("\n");
        copyToClipboard(textData);
        showCopied(selectedData.length);
    }

    // Keyboard: Handle global keydown events (e.g., copy, navigation)
    function handleGlobalKeydown(e: KeyboardEvent): void {
        const activeElement =
            (e.target as HTMLElement) || document.activeElement;
        const isInTable = containerRef && containerRef.contains(activeElement);
        if (!isInTable) return; // Ignore if focus is outside the table

        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
            // Copy selection or all data
            e.preventDefault();
            if (selectionStart && selectionEnd) {
                copySelectedRange("tsv");
            } else {
                copyFilteredData();
            }
        } else if (e.key === "Escape") {
            // Clear selection and stop auto-scrolling
            e.preventDefault();
            selectionStart = null;
            selectionEnd = null;
            focusedCell = null;
            isSelecting = false;
            if (autoScrollRaf) {
                cancelAnimationFrame(autoScrollRaf);
                autoScrollRaf = null;
            }
        } else if (
            ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                e.key,
            ) &&
            !isResizing
        ) {
            // Navigate with arrow keys
            e.preventDefault();
            if (processedData.length === 0 || processedColumns.length === 0)
                return;

            // Initialize focusedCell if not set
            if (!focusedCell) {
                focusedCell = { row: startIndex, col: 0 };
                selectionStart = { ...focusedCell };
                selectionEnd = { ...focusedCell };
            }

            let { row, col } = focusedCell;
            const isShift = e.shiftKey;

            // Update focused cell based on arrow key
            if (e.key === "ArrowUp" && row > 0) {
                row -= 1;
            } else if (
                e.key === "ArrowDown" &&
                row < processedData.length - 1
            ) {
                row += 1;
            } else if (e.key === "ArrowLeft" && col > 0) {
                col -= 1;
            } else if (
                e.key === "ArrowRight" &&
                col < processedColumns.length - 1
            ) {
                col += 1;
            }

            // Update selection
            if (isShift && selectionStart) {
                selectionEnd = { row, col }; // Range selection with Shift
            } else {
                selectionStart = { row, col }; // Single cell selection
                selectionEnd = { row, col };
            }

            focusedCell = { row, col };
            ensureCellVisible(row, col); // Scroll to keep cell in view
        } else if (
            (e.ctrlKey || e.metaKey) &&
            e.key === "Home" &&
            !isResizing
        ) {
            // Jump to top-left cell
            e.preventDefault();
            if (processedData.length === 0 || processedColumns.length === 0)
                return;

            const row = 0;
            const col = 0;
            focusedCell = { row, col };
            selectionStart = { row, col };
            selectionEnd = { row, col };
            ensureCellVisible(row, col);
        } else if ((e.ctrlKey || e.metaKey) && e.key === "End" && !isResizing) {
            // Jump to bottom-right cell
            e.preventDefault();
            if (processedData.length === 0 || processedColumns.length === 0)
                return;

            const row = processedData.length - 1;
            const col = processedColumns.length - 1;
            focusedCell = { row, col };
            selectionStart = { row, col };
            selectionEnd = { row, col };
            ensureCellVisible(row, col);
        } else if (
            (e.ctrlKey || e.metaKey) &&
            (e.key === "a" || e.key === "A") &&
            !isResizing
        ) {
            // Select all cells
            e.preventDefault();
            if (processedData.length === 0 || processedColumns.length === 0)
                return;

            const row = 0;
            const col = 0;
            focusedCell = { row, col };
            selectionStart = { row, col };
            selectionEnd = {
                row: processedData.length - 1,
                col: processedColumns.length - 1,
            };
            ensureCellVisible(row, col);
        }
    }

    // Scrolling: Ensure a cell is visible by adjusting scroll position
    function ensureCellVisible(rowIndex: number, colIndex: number): void {
        if (!containerRef) return;

        // Vertical scroll
        const cellTop = rowIndex * rowHeight;
        const cellBottom = cellTop + rowHeight;
        if (cellTop < scrollTop) {
            scrollTop = cellTop;
            containerRef.scrollTop = scrollTop;
        } else if (cellBottom > scrollTop + containerRef.clientHeight) {
            scrollTop = cellBottom - containerRef.clientHeight;
            containerRef.scrollTop = scrollTop;
        }

        // Horizontal scroll
        let cellLeft = 0;
        for (let i = 0; i < colIndex; i++) {
            cellLeft += parseFloat(processedColumns[i].width);
        }
        const cellRight =
            cellLeft + parseFloat(processedColumns[colIndex].width);
        if (cellLeft < scrollLeft) {
            scrollLeft = cellLeft;
            containerRef.scrollLeft = scrollLeft;
        } else if (cellRight > scrollLeft + containerRef.clientWidth) {
            scrollLeft = cellRight - containerRef.clientWidth;
            containerRef.scrollLeft = scrollLeft;
        }
    }

    // Sorting: Toggle sort order for a column
    function handleSort(event: Event, columnKey: string): void {
        if (sortOrder && sortOrder.key === columnKey) {
            sortOrder = {
                key: columnKey,
                direction: sortOrder.direction === "asc" ? "desc" : "asc",
            };
        } else {
            sortOrder = { key: columnKey, direction: "asc" };
        }
    }

    // Sorting: Clear sort order
    function clearSort(): void {
        sortOrder = null;
    }

    // Scrolling: Update scroll position on user scroll
    function handleScroll(event: Event): void {
        const target = event.target as HTMLElement;
        scrollTop = (target as HTMLDivElement).scrollTop;
        scrollLeft = (target as HTMLDivElement).scrollLeft;
    }

    // Filtering: Debounced filter input handler
    let filterTimeout: any;
    function handleFilter(event: Event): void {
        const target = event.target as HTMLInputElement;
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            filterQuery = target.value;
        }, 300);
    }

    // Styling: Toggle table grid lines
    let horizontal_rule = $state<boolean>(true); // Enable horizontal grid lines
    let vertical_align_bottom = $state<boolean>(true); // Enable vertical grid lines
</script>

<!-- Add global keydown listener -->
<svelte:window onkeydown={handleGlobalKeydown} />

<div class="table-container surface ">
    <!-- Filter and Copy Controls -->
    <div class="controls-container row surface-dim small-padding scroll">
        <button
            onclick={() => copyFilteredData()}
            class="tertiary no-margin small"
        >
            Copy
            <i>table_rows_narrow</i>
            {processedData.length}

            {#if copied}
                <div role="alert">
                    <i>done_all</i>
                    {copiedRowsCount}
                </div>
            {/if}
        </button>
        <div class="filter-container horizontal no-margin">
            <input
                style="max-width: 300px;"
                type="text"
                placeholder="Filter table..."
                value={filterQuery}
                oninput={handleFilter}
                class="filter-input"
                aria-label="Filter table data"
            />
        </div>

        <nav>
            <button
                class="left small {headerOnly ? 'tertiary' : ''}"
                onclick={() => (headerOnly = !headerOnly)}><i>code</i></button
            >
            <button onclick={() => copyFilteredData("csv")} class="small">
                <i>csv</i>
            </button>
            <button class="small" onclick={() => clearSort()}
                ><i>filter_list_off</i></button
            >
        </nav>
    </div>

    <!-- Table -->
    <div
        bind:this={containerRef}
        class="virtualized-table elevate"
        style="height: {containerHeight - 66}px;"
        onscroll={handleScroll}
        role="grid"
        aria-label="Virtualized data table"
        tabindex="0"
    >
        <!-- Header -->
        <div class="table-header">
            <div class="header-row">
                {#each processedColumns as column, index}
                    <!-- svelte-ignore node_invalid_placement_ssr -->
                    <th
                        class="header-cell primary"
                        scope="col"
                        id="column-{index}"
                        style:width={column.width}
                        style:min-width={column.minWidth}
                        onclick={(event) => handleSort(event, column.key)}
                        aria-sort={sortOrder && sortOrder.key === column.key
                            ? sortOrder.direction === "asc"
                                ? "ascending"
                                : "descending"
                            : "none"}
                    >
                        <div class="header-content">
                            {column.title}
                            {#if sortOrder && sortOrder.key === column.key}
                                <span class="sort-indicator">
                                    {sortOrder.direction === "asc" ? "↑" : "↓"}
                                </span>
                            {/if}
                        </div>
                    </th>
                {/each}
            </div>
        </div>

        <!-- Virtual container -->
        {#if processedData.length > 0}
            <div class="table-body" style:height="{totalHeight}px">
                <div style:transform="translateY({offsetY}px)">
                    {#each visibleData as row, rowIndex}
                        <div
                            class="table-row"
                            style:height="{rowHeight}px"
                            role="row"
                            aria-rowindex={startIndex + rowIndex + 1}
                        >
                            {#each processedColumns as column, colIndex}
                                {@const selectedInfo = isCellSelected(
                                    startIndex + rowIndex,
                                    colIndex,
                                )}
                                <!-- svelte-ignore a11y_interactive_supports_focus -->
                                <div
                                    class="table-cell {vertical_align_bottom
                                        ? 'vlines'
                                        : ''} {horizontal_rule ? 'hlines' : ''}"
                                    class:selected={selectedInfo.isSelected}
                                    class:selection-start={selectedInfo.isStart}
                                    role="gridcell"
                                    aria-labelledby="column-{colIndex}"
                                    style:width={column.width}
                                    style:min-width={column.minWidth}
                                    onmousedown={() =>
                                        startSelection(rowIndex, colIndex)}
                                    onmousemove={(event) =>
                                        throttledUpdateSelection(
                                            event,
                                            rowIndex,
                                            colIndex,
                                        )}
                                    onmouseup={endSelection}
                                    tabindex={focusedCell &&
                                    focusedCell.row === startIndex + rowIndex &&
                                    focusedCell.col === colIndex
                                        ? 0
                                        : -1}
                                >
                                    {row[column.key] ?? ""}
                                </div>
                            {/each}
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <div class="empty-state">No data to display</div>
        {/if}
    </div>
</div>

<style>
    .table-container {
        max-width: 100%;
        padding: 0; /* .25rem; */ /* 4px -> 0.25rem */
        font-size: 1rem; /* 12px -> 0.75rem */
        line-height: 1.2; /* Tighter line height */
    }

    .controls-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem; /* 8px -> 0.5rem */
        font-size: 0.75rem; /* Match compact font */
    }

    .filter-container {
        position: relative;
        flex-grow: 1;
        max-width: 15.625rem; /* 250px -> 15.625rem */
    }

    .filter-input {
        width: 100%;
        padding: 0.375rem 1.75rem 0.375rem 0.5rem; 
        border: 0.0625rem solid #e0e0e0; /* 1px -> 0.0625rem */
        border-radius: 0.1875rem; /* 3px -> 0.1875rem */
        font-size: 0.75rem; /* 12px -> 0.75rem */
        font-family: inherit;
    }

    .virtualized-table {
        height: var(--container-height, 25rem); /* 400px -> 25rem */
        overflow: auto;
        font-family: inherit; /* Inherit compact font */
    }

    .table-header {
        border-bottom: 0.0625rem solid #e0e0e0; /* 1px -> 0.0625rem */
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .header-row {
        display: flex;
    }

    .header-cell {
        font-weight: 600;
        text-align: left;
        border-right: 0.0625rem solid #e0e0e0; /* 1px -> 0.0625rem */
        flex: 0 0 auto;
        padding: 0.25rem 0.375rem; /* 4px 6px -> 0.25rem 0.375rem */
        font-size: 0.6875rem; /* 11px -> 0.6875rem */
        line-height: 1.1;
        height: 1.75rem; /* 28px -> 1.75rem */
        display: flex;
        align-items: center;
        user-select: none;
    }

    .header-cell:last-child {
        border-right: none;
    }

    .sort-indicator {
        font-size: 0.625rem; /* 10px -> 0.625rem */
        margin-left: 0.125rem; /* 2px -> 0.125rem */
    }

    .table-body {
        position: relative;
    }

    .table-row {
        display: flex;
        user-select: none;
        width: 100%;
    }

    .vlines {
        border-bottom: solid var(--tertiary) 0.05rem;
    }

    .hlines {
        border-right: solid var(--tertiary) 0.05rem;
    }

    .table-cell {
        padding: 0.125rem 0.375rem; /* 2px 6px -> 0.125rem 0.375rem */
        flex: 0 0 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.75rem; /* 12px -> 0.75rem */
        line-height: 1.2;
        height: 1.75rem; /* 28px -> 1.75rem */
        display: flex;
        align-items: center;
    }

    .table-cell.selected {
        background-color: var(--secondary-container);
        color: var(--on-secondary-container);
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #666;
        font-size: 0.75rem; /* 12px -> 0.75rem */
        font-style: italic;
    }

    ::-webkit-scrollbar {
        width: 0.575rem; /* 6px -> 0.375rem */
        height: 0.575rem; /* 6px -> 0.375rem */
    }

    ::-webkit-scrollbar-track {
        background: var(--surface);
    }

    ::-webkit-scrollbar-thumb {
        background: var(--inverse-surface);
        /* border-radius: 0.1875rem;*/ /* 3px -> 0.1875rem */
    }

    ::-webkit-scrollbar-thumb:hover {
        background: var(--tertiary);
    }
</style>
