# VirtualTable

A high-performance virtualized data table for **Svelte 5** with zero dependencies.

Renders only the rows visible in the viewport, so 500 000 rows feel as fast as 50.

---

Demo : https://chisadrian.github.io/VirtualTable.svelte/

## Features

- 🚀 **Virtual scrolling** — only visible rows are in the DOM
- 🔍 **Per-column filters** with 7 operators (`contains`, `starts`, `ends`, `=`, `!=`, `>`, `<`, `>=`, `<=`)
- ↕️ **Sortable columns** — numeric-aware, empties always at bottom, sort preserved across filter changes
- ✏️ **Inline cell editing** — text or number inputs, saving state, rollback support
- ☑️ **Row selection** — checkbox column with select-all
- 🖱️ **Cell range selection** — click-drag like a spreadsheet, with auto-scroll at edges
- ⌨️ **Full keyboard navigation** — arrows, Ctrl+Home/End, Ctrl+A, Shift+extend, Ctrl+C to copy
- 📋 **Clipboard copy** — selection or full table, TSV or CSV
- ↔️ **Column resizing** — drag handles, optionally persisted to `localStorage`
- 📐 **Fit-to-content** — auto-measure column widths from data
- 🎨 **Themeable** — scoped `--vt-*` CSS variables, auto-inherits MD3 tokens (Beer CSS, etc.)
- ♿ **Accessible** — `role="grid"`, `role="columnheader"`, `aria-sort`, `aria-label` throughout
- 🧩 **Custom cell renderers** via Svelte snippets
- 🔒 **External / locked filters** — hide columns or lock their filter from outside
- 📦 **Zero dependencies** — one `.svelte` file, drop it in and go

---

## Installation

Copy the files into your project. No package install required.

```
src/
  lib/
    VirtualTable.svelte     ← component
    VirtualTable.css        ← styles
    vt/
      sortUtils.js          ← sort & numeric detection
      filterUtils.js        ← filter predicate
      clipboardUtils.js     ← clipboard copy
```

The `.js` utility files are imported automatically by the component — you never need to import them directly.

---

## Quick start

```svelte
<script>
  import VirtualTable from '$lib/VirtualTable.svelte';

  // Row 0 = headers, rows 1-N = data (any primitive values)
  const data = [
    ['ID', 'Name',    'Price'],
    [1,    'Apple',   1.20  ],
    [2,    'Banana',  0.50  ],
    [3,    'Cherry',  3.99  ],
  ];
</script>

<VirtualTable {data} containerHeight={400} />
```

---

## Data format

`data` is a **2-D array** where the first row is the column headers and every subsequent row is a data record.

```js
const data = [
  ['ID', 'Product', 'Price', 'Active'],  // row 0 — headers
  [1,    'Widget',   9.99,    true   ],  // row 1
  [2,    'Gadget',  14.99,    false  ],  // row 2
  // ...
];
```

Column indices (used in props like `editableCols`, `externalFilters`, etc.) refer to the position in this array — `0` = ID, `1` = Product, and so on.

---

## Props

### Layout

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `any[][]` | `[]` | 2-D data array (row 0 = headers) |
| `containerHeight` | `number` | `400` | Total component height in px |
| `rowHeight` | `number` | `28` | Height of each body row in px |
| `overscan` | `number` | `5` | Extra rows rendered beyond the viewport |
| `rowBorderBottom` | `boolean` | `true` | Show bottom border on rows |
| `cellBorderRight` | `boolean` | `true` | Show right border on cells |
| `emptyMessage` | `string` | `"No data to display"` | Message shown when no rows match |

### Selection

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectable` | `boolean` (bindable) | `false` | Show checkbox column |
| `selectedRows` | `any[][]` (bindable) | `[]` | Currently selected rows |

### Filtering

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filterMode` | `"live" \| "manual"` | `"manual"` | `live` — filter as you type (debounced 250ms). `manual` — filter on Enter or Apply button |
| `showFilterOps` | `boolean` (bindable) | `false` | Show/hide the operator dropdowns |
| `externalFilters` | `{ [colIdx]: { hidden?: boolean } }` | `{}` | Hide columns or lock their filter input |
| `extraFilters` | `[colName, op, value][]` | `[]` | Programmatic filters applied before UI filters |
| `filterRowIds` | `string[] \| null` | `null` | Whitelist of `row[0]` values — only these rows are shown |

### Editing

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editableCols` | `{ [colIdx]: "text" \| "number" }` | `{}` | Columns that render an input instead of plain text |
| `onCellEdit` | `(row, colIdx, event, oldVal) => void` | — | Called after a cell value changes. `row[colIdx]` is already updated. `oldVal` is the previous value — use it to roll back on API failure |
| `savingCell` | `{ rowId, ci } \| null` | `null` | Disables the matching cell input while saving |

### Column widths

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fitData` | `boolean` | `false` | Fit column widths to content (scans up to 500 rows) |
| `resizeKey` | `string \| null` | `null` | `localStorage` key for persisting column widths across sessions |

### Row appearance

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `highlightCol` | `string \| null` | `null` | Column name — rows where this column is truthy get a highlight class |
| `rowClass` | `(row) => string \| null` | `null` | Dynamic CSS class applied per row |

### Events / callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onRowClick` | `(row) => void` | Fired when a row is clicked |
| `onCellDblClick` | `(event, row, colIdx) => void` | Fired on cell double-click (requires `cellDblclick={true}`) |
| `onCellContextMenu` | `(row, event, colIdx) => void` | Fired on cell right-click (requires `cellContextMenu={true}`) |
| `cellDblclick` | `boolean` | Enable double-click callback |
| `cellContextMenu` | `boolean` | Enable context-menu callback |

### Custom cell renderers

| Prop | Type | Description |
|------|------|-------------|
| `snippets` | `{ [colName]: (value, row) => Snippet }` | Svelte snippet functions keyed by column header name |

---

## Imperative API

Bind the component instance to call these methods from outside:

```svelte
<script>
  let table;
</script>

<VirtualTable bind:this={table} {data} />

<button onclick={() => table.clearFilters()}>Reset</button>
```

| Method | Description |
|--------|-------------|
| `setFilters(map)` | Apply filters programmatically. Accepts `Map<colIdx, {op, value}>` or a plain object |
| `clearFilters()` | Clear all active filters |
| `getFilters()` | Returns a copy of the currently applied filter `Map` |
| `clearSort()` | Reset sort to unsorted order |

---

## Filter operators

All operators work on text columns. Numeric operators additionally do proper numeric comparison when both the cell value and filter value are valid numbers.

| Operator | Symbol | Description |
|----------|--------|-------------|
| `contains` | `%_` | Cell contains the filter string (default) |
| `starts` | `\|%` | Cell starts with the filter string |
| `ends` | `%\|` | Cell ends with the filter string |
| `equals` | `=` | Exact match (numeric-aware) |
| `!=` | `≠` | Not equal (numeric-aware) |
| `>` | `>` | Greater than (numeric columns only) |
| `<` | `<` | Less than (numeric columns only) |
| `>=` | `>=` | Greater than or equal (numeric columns only) |
| `<=` | `<=` | Less than or equal (numeric columns only) |

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Arrow keys` | Move focused cell |
| `Ctrl + Arrow` | Jump to edge of data block |
| `Shift + Arrow` | Extend selection |
| `Ctrl + A` | Select all cells |
| `Ctrl + Home` | Jump to first cell |
| `Ctrl + End` | Jump to last cell |
| `Ctrl + C` | Copy selection (or full table if no selection) as TSV |
| `Escape` | Clear selection |
| `Enter` | Apply filters (in manual mode) |

---

## Custom cell renderers

Define a Svelte snippet and pass it via the `snippets` prop, keyed by the **column header name**:

```svelte
{#snippet statusCell(value, row)}
  <span class="badge badge-{value.toLowerCase()}">{value}</span>
{/snippet}

<VirtualTable
  {data}
  snippets={{ Status: statusCell }}
/>
```

The snippet receives `(value, row)` — the cell value and the full row array.

---

## Inline editing

Mark columns as editable and handle saves via `onCellEdit`:

```svelte
<script>
  let savingCell = $state(null);

  // row[ci] is already updated when this is called.
  // oldVal lets you roll back if the save fails.
  async function onCellEdit(row, ci, event, oldVal) {
    savingCell = { rowId: row[0], ci };
    try {
      await api.save({ id: row[0], col: ci, value: row[ci] });
    } catch {
      row[ci] = oldVal;   // roll back on failure
    } finally {
      savingCell = null;
    }
  }
</script>

<VirtualTable
  {data}
  editableCols={{ 1: 'text', 3: 'number' }}
  {savingCell}
  {onCellEdit}
/>
```

While `savingCell` matches a cell, its input is disabled and styled to indicate saving.

---

---

## Handlers at a glance

Every interaction is a plain callback prop — no stores, no event bus, no boilerplate. You wire up only what you need.

```svelte
<VirtualTable
  {data}

  <!-- Row interaction -->
  onRowClick={(row) => console.log(row)}

  <!-- Double-click a cell -->
  cellDblclick={true}
  onCellDblClick={(e, row, ci) => openDetail(row)}

  <!-- Right-click a cell -->
  cellContextMenu={true}
  onCellContextMenu={(row, e, ci) => showMenu(row, e, ci)}

  <!-- Inline editing — row[ci] already updated, oldVal for rollback -->
  editableCols={{ 1: "text", 3: "number" }}
  onCellEdit={async (row, ci, e, oldVal) => {
      try   { await save(row[0], ci, row[ci]); }
      catch { row[ci] = oldVal; }
  }}

  <!-- Row selection -->
  bind:selectable
  bind:selectedRows

  <!-- Custom cell renderer per column -->
  snippets={{ Status: statusSnippet }}
/>
```

That's the full interaction surface. Each handler is independent — add one without touching the others.

---

## Programmatic filtering

Use `extraFilters` for filters that come from your app logic rather than the user:

```svelte
<!-- Only show active rows with stock > 0 -->
<VirtualTable
  {data}
  extraFilters={[
    ['Status', '=',  'Active'],
    ['Stock',  '>',  0       ],
  ]}
/>
```

Or control filters imperatively:

```svelte
<script>
  let table;

  function filterByCategory(cat) {
    table.setFilters({ 2: { op: 'equals', value: cat } });
  }
</script>

<VirtualTable bind:this={table} {data} />
```

---

## Theming

VirtualTable uses standard **Material Design 3** CSS variable names — the same ones used by [Beer CSS](https://www.beercss.com/) and other MD3 design systems.

### With Beer CSS (or any MD3 system)

No configuration needed. Beer CSS defines these tokens on `:root`, which takes precedence over the component's own defaults. Your app theme is applied automatically.

### Without a design system

The component ships with sensible light-mode defaults in `VirtualTable.css`. It works out of the box with zero configuration.

### Custom overrides

Set the MD3 tokens on any wrapper element — they cascade into the component:

```css
.my-wrapper {
  --primary:     #1a237e;
  --on-primary:  #ffffff;
  --surface:     #f5f5f5;
  --on-surface:  #111111;
}
```

### Available tokens

| Token | Role |
|-------|------|
| `--primary` | Header background, Apply button |
| `--on-primary` | Header text, filter input text |
| `--primary-container` | Focused edit cell background |
| `--on-primary-container` | Focused edit cell text |
| `--secondary-container` | Selected cell background, badge |
| `--on-secondary-container` | Selected cell text, badge text |
| `--surface` | Body background |
| `--on-surface` | Body text |
| `--surface-variant` | Controls bar background |
| `--surface-bright` | Hover states |
| `--surface-dim` | Bottom border |
| `--outline` | Column borders, filter borders |
| `--tertiary` | Row borders, cell borders |
| `--inverse-primary` | Highlighted row background |

---

## Full example

```svelte
<script>
  import VirtualTable from '$lib/VirtualTable.svelte';

  const STATUSES = ['Active', 'Pending', 'Inactive'];

  const data = [
    ['ID', 'Product', 'Price', 'Stock', 'Status'],
    ...Array.from({ length: 1000 }, (_, i) => [
      i + 1,
      `Product ${i + 1}`,
      +(Math.random() * 100).toFixed(2),
      Math.floor(Math.random() * 500),
      STATUSES[i % 3],
    ]),
  ];

  let selectable   = $state(false);
  let selectedRows = $state([]);
  let savingCell   = $state(null);

  async function onCellEdit(row, ci, e, oldVal) {
    savingCell = { rowId: row[0], ci };
    try {
      await fetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({ id: row[0], col: ci, value: row[ci] }),
      });
    } catch {
      row[ci] = oldVal;
    } finally {
      savingCell = null;
    }
  }
</script>

{#snippet statusCell(value)}
  <span style="color: {value === 'Active' ? 'green' : 'gray'}">{value}</span>
{/snippet}

<VirtualTable
  {data}
  containerHeight={500}
  bind:selectable
  bind:selectedRows
  editableCols={{ 1: 'text', 2: 'number', 3: 'number' }}
  {savingCell}
  {onCellEdit}
  filterMode="live"
  highlightCol="Status"
  rowClass={(row) => row[4] === 'Inactive' ? 'row-muted' : ''}
  resizeKey="my-table"
  snippets={{ Status: statusCell }}
  onRowClick={(row) => console.log('clicked', row)}
/>
```

---

## Requirements

- **Svelte 5** (uses runes: `$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- No other dependencies

---

## License

MIT
