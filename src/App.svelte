<script>
  import { onMount } from "svelte";
  import VirtualTable from "./VirtualTable.svelte";

  // ─── Data ─────────────────────────────────────────────────────────────────
  const CATEGORIES = ["Electronics", "Clothing", "Food", "Tools", "Books"];
  const STATUSES = ["Active", "Pending", "Inactive"];
  const CUSTOMERS = [
    "Acme Corp",
    "Globex",
    "Initech",
    "Umbrella",
    "Stark Industries",
  ];

  function makeData(n = 500) {
    const h = [
      "ID",
      "Product",
      "Category",
      "Price",
      "Stock",
      "Status",
      "Customer",
      "Rating",
      "Notes",
    ];
    const rows = Array.from({ length: n }, (_, i) => [
      i + 1,
      `Product ${i + 1}`,
      CATEGORIES[i % CATEGORIES.length],
      +(Math.random() * 999 + 1).toFixed(2),
      Math.floor(Math.random() * 500),
      STATUSES[i % STATUSES.length],
      CUSTOMERS[i % CUSTOMERS.length],
      +(Math.random() * 4 + 1).toFixed(1),
      i % 8 === 0 ? "Featured" : "",
    ]);
    return [h, ...rows];
  }

  let data = $state(makeData(500));
  let rowCount = $state(500);

  // ─── Tab state ────────────────────────────────────────────────────────────
  let activeTab = $state("basic");

  // ─── Tab 1: Basic ─────────────────────────────────────────────────────────
  let selectable = $state(false);
  let selectedRows = $state([]);
  let savingCell = $state(null);
  let filterMode = $state("live");

  const editableCols = { 1: "text", 3: "number", 4: "number" };

  async function onCellEdit(row, ci, e, oldVal) {
    savingCell = { rowId: row[0], ci };
    try {
      await new Promise((r) => setTimeout(r, 600)); // simulate API save
    } catch {
      row[ci] = oldVal;
    } finally {
      savingCell = null;
    }
  }

  // ─── Tab 2: Advanced ──────────────────────────────────────────────────────
  let tableAdv = $state();
  let filterStatus = $state("");
  let filterMinPrice = $state("");
  let onlyInStock = $state(false);
  let productSearch = $state("");

  let contextMenuVisible = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);
  let contextMenuRow = $state(null);

  // extraFilters — composed from UI controls, passed as a prop
  const extraFilters = $derived([
    ...(filterStatus ? [["Status", "equals", filterStatus]] : []),
    ...(onlyInStock ? [["Stock", ">", 0]] : []),
    ...(filterMinPrice ? [["Price", ">=", Number(filterMinPrice)]] : []),
  ]);

  // filterRowIds — whitelist rows whose Product name matches the search
  const filterRowIds = $derived.by(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return null;
    return data
      .slice(1)
      .filter((r) => String(r[1]).toLowerCase().includes(q))
      .map((r) => r[0]);
  });

  // rowClass — dynamic CSS class per row
  function rowClass(row) {
    if (row[5] === "Inactive") return "row-inactive";
    if (row[8]) return "row-featured";
    return "";
  }

  function onCellContextMenu(row, e, ci) {
    contextMenuRow = row;
    contextMenuX = e.clientX;
    contextMenuY = e.clientY;
    contextMenuVisible = true;
  }

  function closeContextMenu() {
    contextMenuVisible = false;
  }

  function ctxCopyRow() {
    if (!contextMenuRow) return;
    navigator.clipboard?.writeText(contextMenuRow.join("\t"));
    closeContextMenu();
  }

  function ctxFilterByCustomer() {
    if (!contextMenuRow) return;
    // setFilters imperatively — col 6 = Customer
    tableAdv?.setFilters({ 6: { op: "equals", value: contextMenuRow[6] } });
    closeContextMenu();
  }

  // ─── FPS ──────────────────────────────────────────────────────────────────
  let fps = $state(0);
  let _f = 0,
    _t = performance.now();
  function trackFPS() {
    _f++;
    const now = performance.now();
    if (now >= _t + 1000) {
      fps = Math.round((_f * 1000) / (now - _t));
      _f = 0;
      _t = now;
    }
    requestAnimationFrame(trackFPS);
  }
  onMount(() => requestAnimationFrame(trackFPS));

  let innerHeight = $state(700);
  const tableHeight = $derived(innerHeight - 195);
  const fpsColor = $derived(
    fps > 55 ? "#4caf50" : fps > 40 ? "#ff9800" : "#f44336",
  );
</script>

<svelte:window bind:innerHeight />

<!-- ─── Snippets ─────────────────────────────────────────────────────────── -->

{#snippet statusCell(value)}
  <span class="status-chip status-{(value ?? '').toLowerCase()}">{value}</span>
{/snippet}

{#snippet ratingCell(value)}
  {@const n = Number(value) || 0}
  <span class="rating" title="{value} / 5">
    {#each [1, 2, 3, 4, 5] as s}
      <span class:filled={s <= Math.round(n)}>★</span>
    {/each}
    <span class="rating-num">{value}</span>
  </span>
{/snippet}

{#snippet stockCell(value)}
  {@const n = Number(value)}
  {@const pct = Math.min(100, n / 5)}
  {@const color = n < 50 ? "#f44336" : n < 150 ? "#ff9800" : "#4caf50"}
  <span class="stock-bar">
    <span class="stock-fill" style="width:{pct}%; background:{color}"></span>
    <span class="stock-label">{value}</span>
  </span>
{/snippet}

<!-- ─── Context menu ──────────────────────────────────────────────────────── -->
{#if contextMenuVisible}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="ctx-backdrop" onclick={closeContextMenu}></div>
  <div class="ctx-menu" style="left:{contextMenuX}px; top:{contextMenuY}px;">
    <button onclick={ctxCopyRow}>📋 Copy row as TSV</button>
    <button onclick={ctxFilterByCustomer}>🔍 Filter by this customer</button>
    <hr />
    <button onclick={closeContextMenu}>✕ Close</button>
  </div>
{/if}

<!-- ─── Shell ─────────────────────────────────────────────────────────────── -->
<main class="shell">
  <!-- Header -->
  <header class="app-header">
    <div class="header-left">
      <h1>VirtualTable <span class="version">v1.0</span></h1>
      <p>Svelte 5 · zero dependencies · virtual scroll</p>
    </div>
    <div class="header-right">
      <select
        class="ctrl-select"
        onchange={(e) => {
          // @ts-ignore
          rowCount = Number(e.target.value);
          data = makeData(rowCount);
        }}
      >
        <option value="500">500 rows</option>
        <option value="10000">10 000 rows</option>
        <option value="100000">100 000 rows</option>
        <option value="500000">500 000 rows</option>
      </select>
      <button class="ctrl-btn" onclick={() => (data = makeData(rowCount))}
        >↺ Reload</button
      >
      <div class="fps-badge" style="background:{fpsColor}">FPS {fps}</div>
    </div>
  </header>

  <!-- Tabs -->
  <nav class="tab-nav">
    <button
      class="tab-btn"
      class:active={activeTab === "basic"}
      onclick={() => (activeTab = "basic")}
    >
      ① Basic
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === "advanced"}
      onclick={() => (activeTab = "advanced")}
    >
      ② Advanced
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === "snippets"}
      onclick={() => (activeTab = "snippets")}
    >
      ③ Custom renderers
    </button>
  </nav>

  <!-- ── Tab 1: Basic ─────────────────────────────────────────────────── -->
  {#if activeTab === "basic"}
    <div class="tab-controls">
      <label class="ctrl-label">
        <input type="checkbox" bind:checked={selectable} />
        Row selection
      </label>
      <label class="ctrl-label">
        <input
          type="checkbox"
          checked={filterMode === "manual"}
          // @ts-ignore
          onchange={(e) => (filterMode = e.target.checked ? "manual" : "live")}
        />
        Manual filter
      </label>
      {#if selectedRows.length > 0}
        <span class="info-badge">{selectedRows.length} selected</span>
      {/if}
      <span class="hint">
        💡 Click headers to sort · drag column edges to resize · Ctrl+C to copy
        · double-click editable cells (Product, Price, Stock)
      </span>
    </div>

    <VirtualTable
      {data}
      containerHeight={tableHeight}
      bind:selectable
      bind:selectedRows
      {editableCols}
      {savingCell}
      {filterMode}
      {onCellEdit}
      resizeKey="demo-basic"
      highlightCol="Notes"
      snippets={{ Status: statusCell }}
    />

    <!-- ── Tab 2: Advanced ──────────────────────────────────────────────── -->
  {:else if activeTab === "advanced"}
    <div class="tab-controls">
      <select class="ctrl-select" bind:value={filterStatus}>
        <option value="">All statuses</option>
        {#each STATUSES as s}<option>{s}</option>{/each}
      </select>

      <input
        class="ctrl-input"
        type="number"
        min="0"
        placeholder="Min price…"
        bind:value={filterMinPrice}
      />

      <label class="ctrl-label">
        <input type="checkbox" bind:checked={onlyInStock} />
        In stock only
      </label>

      <div class="search-wrap">
        <input
          class="ctrl-input"
          placeholder="🔍 Search product…"
          bind:value={productSearch}
        />
        {#if productSearch}
          <button class="clear-btn" onclick={() => (productSearch = "")}
            >×</button
          >
        {/if}
      </div>

      <button
        class="ctrl-btn"
        onclick={() => {
          filterStatus = "";
          filterMinPrice = "";
          onlyInStock = false;
          productSearch = "";
          tableAdv?.clearFilters();
        }}>✕ Reset</button
      >

      <span class="hint"
        >💡 Right-click any cell · inactive rows are dimmed · featured rows are
        highlighted</span
      >
    </div>

    <VirtualTable
      bind:this={tableAdv}
      {data}
      containerHeight={tableHeight}
      {extraFilters}
      {filterRowIds}
      {rowClass}
      cellContextMenu={true}
      {onCellContextMenu}
      resizeKey="demo-advanced"
      snippets={{ Status: statusCell }}
    />

    <!-- ── Tab 3: Custom renderers ──────────────────────────────────────── -->
  {:else if activeTab === "snippets"}
    <div class="tab-controls">
      <span class="hint">
        💡
        <strong>Status</strong> → coloured chip &nbsp;·&nbsp;
        <strong>Rating</strong> → star display &nbsp;·&nbsp;
        <strong>Stock</strong> → progress bar — all defined as Svelte
        <code>{"{#snippet}"}</code>
        and passed via the <code>snippets</code> prop
      </span>
    </div>

    <VirtualTable
      {data}
      containerHeight={tableHeight}
      resizeKey="demo-snippets"
      snippets={{
        Status: statusCell,
        Rating: ratingCell,
        Stock: stockCell,
      }}
    />
  {/if}
</main>

<style>
  /* ── Shell ── */
  .shell {
    display: flex;
    flex-direction: column;
    height: 95vh;
    padding: 0.6rem 1rem 0.5rem;
    gap: 0.4rem;
    box-sizing: border-box;
    font-family: inherit;
  }

  /* ── Header ── */
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .header-left h1 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
  }
  .version {
    font-size: 0.7rem;
    font-weight: 400;
    opacity: 0.5;
    margin-left: 0.25rem;
  }
  .header-left p {
    margin: 0;
    font-size: 0.72rem;
    opacity: 0.5;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  /* ── Tabs ── */
  .tab-nav {
    display: flex;
    gap: 0.15rem;
    border-bottom: 2px solid var(--surface-variant, #e7e0ec);
  }
  .tab-btn {
    padding: 0.3rem 0.85rem;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.78rem;
    font-family: inherit;
    border-radius: 0.4rem 0.4rem 0 0;
    color: var(--on-surface, #1c1b1f);
    opacity: 0.55;
    transition:
      opacity 0.12s,
      background 0.12s;
  }
  .tab-btn:hover {
    opacity: 0.8;
    background: var(--surface-variant, #e7e0ec);
  }
  .tab-btn.active {
    opacity: 1;
    font-weight: 600;
    background: var(--surface-variant, #e7e0ec);
    border-bottom: 2px solid var(--primary, #13302e);
    margin-bottom: -2px;
  }

  /* ── Controls bar ── */
  .tab-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.35rem 0.6rem;
    background: var(--surface-variant, #e7e0ec);
    border-radius: 0.5rem;
    font-size: 0.78rem;
  }

  .ctrl-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    user-select: none;
  }
  .ctrl-btn {
    padding: 0.2rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid currentColor;
    background: transparent;
    cursor: pointer;
    font-size: 0.75rem;
    font-family: inherit;
  }
  .ctrl-select,
  .ctrl-input {
    padding: 0.18rem 0.4rem;
    border-radius: 0.3rem;
    border: 1px solid var(--outline, #79747e);
    background: var(--surface, #fff);
    font-size: 0.75rem;
    font-family: inherit;
  }
  .ctrl-input {
    width: 8.5rem;
  }

  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .clear-btn {
    position: absolute;
    right: 0.3rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    opacity: 0.5;
    padding: 0;
    line-height: 1;
  }
  .clear-btn:hover {
    opacity: 1;
  }

  .hint {
    font-size: 0.7rem;
    opacity: 0.5;
    margin-left: auto;
  }
  .hint code {
    background: rgba(0, 0, 0, 0.07);
    padding: 0.05rem 0.25rem;
    border-radius: 3px;
    font-size: 0.68rem;
  }

  .info-badge {
    padding: 0.15rem 0.45rem;
    border-radius: 999px;
    font-size: 0.7rem;
    background: var(--secondary-container, #e8def8);
    color: var(--on-secondary-container, #1d192b);
  }

  .fps-badge {
    padding: 0.18rem 0.5rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    color: #fff;
    min-width: 4.5rem;
    text-align: center;
  }

  /* ── Context menu ── */
  .ctx-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
  }
  .ctx-menu {
    position: fixed;
    z-index: 201;
    background: var(--surface, #fff);
    border: 1px solid var(--outline, #79747e);
    border-radius: 0.4rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    min-width: 12rem;
    overflow: hidden;
  }
  .ctx-menu button {
    padding: 0.4rem 0.75rem;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.78rem;
    font-family: inherit;
  }
  .ctx-menu button:hover {
    background: var(--surface-variant, #e7e0ec);
  }
  .ctx-menu hr {
    margin: 0.15rem 0;
    border: none;
    border-top: 1px solid var(--surface-dim, #ddd8e4);
  }

  /* ── Status chip snippet ── */
  :global(.status-chip) {
    display: inline-block;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    white-space: nowrap;
  }
  :global(.status-active) {
    background: #c8e6c9;
    color: #1b5e20;
  }
  :global(.status-pending) {
    background: #fff9c4;
    color: #e65100;
  }
  :global(.status-inactive) {
    background: #ffcdd2;
    color: #b71c1c;
  }

  /* ── Rating stars snippet ── */
  :global(.rating) {
    display: flex;
    align-items: center;
    gap: 0.05rem;
    font-size: 0.8rem;
    line-height: 1;
  }
  :global(.rating span) {
    color: #e0e0e0;
  }
  :global(.rating span.filled) {
    color: #f9a825;
  }
  :global(.rating-num) {
    font-size: 0.62rem;
    opacity: 0.55;
    margin-left: 0.2rem;
    color: var(--on-surface, #1c1b1f) !important;
  }

  /* ── Stock bar snippet ── */
  :global(.stock-bar) {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 1rem;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 999px;
    overflow: hidden;
  }
  :global(.stock-fill) {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    opacity: 0.45;
  }
  :global(.stock-label) {
    position: relative;
    z-index: 1;
    font-size: 0.62rem;
    font-weight: 600;
    padding: 0 0.4rem;
  }

  /* ── Row classes (Advanced tab) ── */
  :global(.row-inactive) {
    opacity: 0.38;
  }
  :global(.row-featured) {
    background: #fffde7 !important;
  }
</style>
