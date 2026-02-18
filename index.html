<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VirtualizedTable — Svelte 5 Component</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --ink:       #0f0f0f;
            --ink-soft:  #5a5a5a;
            --ink-muted: #999;
            --rule:      #e8e8e8;
            --bg:        #ffffff;
            --bg-soft:   #f7f7f5;
            --bg-code:   #f2f2f0;
            --accent:    #ff3e00;        /* Svelte orange */
            --accent-dim:#fff0ed;
            --green:     #16a34a;
            --mono:      'DM Mono', monospace;
            --sans:      'DM Sans', sans-serif;
            --radius:    6px;
        }

        html { scroll-behavior: smooth; }

        body {
            font-family: var(--sans);
            color: var(--ink);
            background: var(--bg);
            font-size: 16px;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }

        /* ── Layout ─────────────────────────────────────── */
        .container {
            max-width: 860px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        section { padding: 4rem 0; border-bottom: 1px solid var(--rule); }
        section:last-child { border-bottom: none; }

        /* ── Nav ────────────────────────────────────────── */
        nav {
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(8px);
            border-bottom: 1px solid var(--rule);
        }

        nav .inner {
            max-width: 860px;
            margin: 0 auto;
            padding: 0 2rem;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .nav-brand {
            font-family: var(--mono);
            font-weight: 500;
            font-size: 0.9rem;
            color: var(--ink);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .nav-brand .dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: var(--accent);
        }

        .nav-links {
            display: flex;
            gap: 1.5rem;
            list-style: none;
        }

        .nav-links a {
            font-size: 0.85rem;
            color: var(--ink-soft);
            text-decoration: none;
            transition: color 0.15s;
        }

        .nav-links a:hover { color: var(--ink); }

        /* ── Hero ───────────────────────────────────────── */
        .hero {
            padding: 5rem 0 4rem;
            border-bottom: 1px solid var(--rule);
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            font-family: var(--mono);
            font-size: 0.72rem;
            color: var(--accent);
            background: var(--accent-dim);
            border: 1px solid #ffd0c4;
            border-radius: 100px;
            padding: 0.25rem 0.75rem;
            margin-bottom: 1.5rem;
        }

        .hero h1 {
            font-size: clamp(2.2rem, 5vw, 3.2rem);
            font-weight: 600;
            line-height: 1.15;
            letter-spacing: -0.03em;
            margin-bottom: 1.25rem;
        }

        .hero h1 span {
            color: var(--accent);
        }

        .hero-sub {
            font-size: 1.1rem;
            color: var(--ink-soft);
            font-weight: 300;
            max-width: 520px;
            margin-bottom: 2.5rem;
            line-height: 1.7;
        }

        .hero-actions {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.6rem 1.25rem;
            border-radius: var(--radius);
            font-family: var(--sans);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.15s;
            border: 1.5px solid transparent;
        }

        .btn-primary {
            background: var(--ink);
            color: #fff;
        }
        .btn-primary:hover { background: #333; }

        .btn-outline {
            background: transparent;
            color: var(--ink);
            border-color: var(--rule);
        }
        .btn-outline:hover { border-color: #ccc; background: var(--bg-soft); }

        .hero-stats {
            display: flex;
            gap: 2.5rem;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid var(--rule);
        }

        .stat-value {
            font-family: var(--mono);
            font-size: 1.6rem;
            font-weight: 500;
            color: var(--ink);
            line-height: 1;
            margin-bottom: 0.3rem;
        }

        .stat-label {
            font-size: 0.8rem;
            color: var(--ink-muted);
        }

        /* ── Section headings ───────────────────────────── */
        .section-label {
            font-family: var(--mono);
            font-size: 0.7rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--ink-muted);
            margin-bottom: 0.75rem;
        }

        h2 {
            font-size: 1.6rem;
            font-weight: 600;
            letter-spacing: -0.02em;
            margin-bottom: 1.5rem;
        }

        h3 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        p { color: var(--ink-soft); line-height: 1.7; margin-bottom: 1rem; }
        p:last-child { margin-bottom: 0; }

        /* ── Feature grid ───────────────────────────────── */
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 1px;
            background: var(--rule);
            border: 1px solid var(--rule);
            border-radius: var(--radius);
            overflow: hidden;
            margin-top: 2rem;
        }

        .feature-card {
            background: var(--bg);
            padding: 1.5rem;
            transition: background 0.15s;
        }

        .feature-card:hover { background: var(--bg-soft); }

        .feature-icon {
            font-size: 1.3rem;
            margin-bottom: 0.75rem;
        }

        .feature-card h3 { font-size: 0.9rem; margin-bottom: 0.35rem; }

        .feature-card p {
            font-size: 0.82rem;
            color: var(--ink-muted);
            margin: 0;
            line-height: 1.5;
        }

        /* ── Code blocks ────────────────────────────────── */
        .code-wrap {
            background: var(--bg-code);
            border: 1px solid var(--rule);
            border-radius: var(--radius);
            overflow: hidden;
            margin: 1.5rem 0;
        }

        .code-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.6rem 1rem;
            border-bottom: 1px solid var(--rule);
            background: var(--bg-soft);
        }

        .code-lang {
            font-family: var(--mono);
            font-size: 0.7rem;
            color: var(--ink-muted);
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .copy-btn {
            font-family: var(--mono);
            font-size: 0.7rem;
            color: var(--ink-muted);
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.15rem 0.4rem;
            border-radius: 3px;
            transition: all 0.15s;
        }

        .copy-btn:hover { background: var(--rule); color: var(--ink); }
        .copy-btn.copied { color: var(--green); }

        pre {
            padding: 1.25rem;
            overflow-x: auto;
            font-family: var(--mono);
            font-size: 0.82rem;
            line-height: 1.7;
            color: var(--ink);
        }

        .kw  { color: #d73a49; }   /* keyword */
        .cm  { color: #6a737d; }   /* comment */
        .st  { color: #032f62; }   /* string */
        .at  { color: #e36209; }   /* attribute */
        .fn  { color: #6f42c1; }   /* function */
        .nm  { color: #005cc5; }   /* name/prop */

        /* ── Props table ────────────────────────────────── */
        .props-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1.5rem;
            font-size: 0.875rem;
        }

        .props-table thead th {
            text-align: left;
            padding: 0.6rem 1rem;
            font-size: 0.72rem;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--ink-muted);
            border-bottom: 2px solid var(--rule);
        }

        .props-table tbody tr {
            border-bottom: 1px solid var(--rule);
            transition: background 0.1s;
        }

        .props-table tbody tr:hover { background: var(--bg-soft); }
        .props-table tbody tr:last-child { border-bottom: none; }

        .props-table td {
            padding: 0.75rem 1rem;
            vertical-align: top;
            color: var(--ink-soft);
            line-height: 1.5;
        }

        .props-table td:first-child {
            font-family: var(--mono);
            font-size: 0.8rem;
            color: var(--ink);
            white-space: nowrap;
        }

        .tag {
            display: inline-block;
            font-family: var(--mono);
            font-size: 0.7rem;
            padding: 0.1rem 0.4rem;
            border-radius: 3px;
            background: var(--bg-code);
            color: var(--ink-soft);
            border: 1px solid var(--rule);
        }

        .tag-bindable {
            background: #fff0ed;
            color: var(--accent);
            border-color: #ffd0c4;
        }

        /* ── Performance section ────────────────────────── */
        .perf-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 1.5rem;
        }

        .perf-card {
            background: var(--bg-soft);
            border: 1px solid var(--rule);
            border-radius: var(--radius);
            padding: 1.25rem 1.5rem;
        }

        .perf-card h3 {
            font-size: 0.85rem;
            color: var(--ink-muted);
            font-weight: 400;
            margin-bottom: 0.4rem;
        }

        .perf-value {
            font-family: var(--mono);
            font-size: 1.4rem;
            font-weight: 500;
            color: var(--ink);
        }

        .perf-note {
            font-size: 0.78rem;
            color: var(--ink-muted);
            margin-top: 0.3rem;
        }

        .callout {
            background: var(--accent-dim);
            border-left: 3px solid var(--accent);
            border-radius: 0 var(--radius) var(--radius) 0;
            padding: 1rem 1.25rem;
            margin: 1.5rem 0;
            font-size: 0.875rem;
            color: var(--ink-soft);
        }

        .callout strong { color: var(--ink); }

        /* ── Keyboard shortcuts ─────────────────────────── */
        .kbd-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-top: 1.5rem;
        }

        .kbd-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.6rem 0.75rem;
            background: var(--bg-soft);
            border: 1px solid var(--rule);
            border-radius: var(--radius);
            font-size: 0.82rem;
        }

        .kbd-desc { color: var(--ink-soft); }

        .kbd-keys {
            display: flex;
            gap: 0.25rem;
        }

        kbd {
            display: inline-block;
            font-family: var(--mono);
            font-size: 0.7rem;
            padding: 0.15rem 0.4rem;
            background: var(--bg);
            border: 1px solid #ccc;
            border-bottom-width: 2px;
            border-radius: 3px;
            color: var(--ink);
            white-space: nowrap;
        }

        /* ── Footer ─────────────────────────────────────── */
        footer {
            padding: 2.5rem 0;
            border-top: 1px solid var(--rule);
            font-size: 0.82rem;
            color: var(--ink-muted);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        footer a { color: var(--ink-soft); text-decoration: none; }
        footer a:hover { color: var(--ink); }

        @media (max-width: 600px) {
            .perf-grid { grid-template-columns: 1fr; }
            .kbd-grid  { grid-template-columns: 1fr; }
            .hero-stats { gap: 1.5rem; flex-wrap: wrap; }
        }
    </style>
</head>
<body>

<!-- Nav -->
<nav>
    <div class="inner">
        <a class="nav-brand" href="#">
            <span class="dot"></span>
            VirtualizedTable
        </a>
        <ul class="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#usage">Usage</a></li>
            <li><a href="#props">Props</a></li>
            <li><a href="#performance">Performance</a></li>
            <li><a href="https://github.com" target="_blank">GitHub ↗</a></li>
        </ul>
    </div>
</nav>

<!-- Hero -->
<div class="hero">
    <div class="container">
        <div class="hero-badge">
            <span>●</span> Svelte 5 · Runes
        </div>
        <h1>
            Virtualized<span>Table</span>
        </h1>
        <p class="hero-sub">
            A high-performance virtualized data table for Svelte 5.
            Handles 50k+ rows smoothly with zero object allocation,
            spreadsheet-style keyboard navigation, and a minimal footprint.
        </p>
        
        <div class="hero-stats">
            <div>
                <div class="stat-value">50k+</div>
                <div class="stat-label">rows, no sweat</div>
            </div>
            <div>
                <div class="stat-value">0</div>
                <div class="stat-label">object allocations</div>
            </div>
            <div>
                <div class="stat-value">~350</div>
                <div class="stat-label">lines of code</div>
            </div>
            <div>
                <div class="stat-value">Svelte 5</div>
                <div class="stat-label">runes-based</div>
            </div>
        </div>
    </div>
</div>

<!-- Features -->
<section id="features">
    <div class="container">
        <div class="section-label">What's included</div>
        <h2>Everything you need, nothing you don't</h2>
        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h3>Virtual scrolling</h3>
                <p>Only visible rows are rendered. Scroll through 50k rows at 60fps.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🔢</div>
                <h3>Zero allocation</h3>
                <p>2D array rows are never converted to objects. <code>data.slice(1)</code> and done.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🔤</div>
                <h3>Column sort</h3>
                <p>Click any header to sort. Auto-detects numeric vs string columns.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🔍</div>
                <h3>Per-column filter</h3>
                <p>Debounced filter inputs on every column. Stacks with sorting.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📋</div>
                <h3>Cell range selection</h3>
                <p>Click-drag to select a range. Copy as TSV or CSV with Ctrl+C.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">⌨️</div>
                <h3>Keyboard navigation</h3>
                <p>Arrow keys, Ctrl+Arrow jumps, Shift to extend selection, Ctrl+A, Home, End.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">☑️</div>
                <h3>Row selection</h3>
                <p>Optional checkbox column. Select all visible, bindable output array.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🖱️</div>
                <h3>Auto-scroll on drag</h3>
                <p>Drag-select near edges and the table scrolls automatically.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📐</div>
                <h3>Smart column widths</h3>
                <p>Header-only (fast) or data-sampled (accurate) width calculation. Toggle at runtime.</p>
            </div>
        </div>
    </div>
</section>

<!-- Usage -->
<section id="usage">
    <div class="container">
        <div class="section-label">Usage</div>
        <h2>Get started</h2>

        <h3>Data format</h3>
        <p>Pass a 2D array where the first row is headers and subsequent rows are data.</p>

        <div class="code-wrap">
            <div class="code-header">
                <span class="code-lang">js</span>
                <button class="copy-btn" onclick="copyCode(this)">copy</button>
            </div>
            <pre><span class="kw">const</span> <span class="nm">data</span> = [
  [<span class="st">"ID"</span>, <span class="st">"NAME"</span>, <span class="st">"STATUS"</span>, <span class="st">"QTY"</span>],   <span class="cm">// row 0 = headers</span>
  [<span class="st">"001"</span>, <span class="st">"Widget A"</span>, <span class="st">"Active"</span>, <span class="st">"42"</span>],
  [<span class="st">"002"</span>, <span class="st">"Widget B"</span>, <span class="st">"New"</span>, <span class="st">"7"</span>],
  <span class="cm">// ... 50 000 more rows</span>
];</pre>
        </div>

        <h3>Basic usage</h3>

        <div class="code-wrap">
            <div class="code-header">
                <span class="code-lang">svelte</span>
                <button class="copy-btn" onclick="copyCode(this)">copy</button>
            </div>
            <pre><span class="kw">&lt;script&gt;</span>
  <span class="kw">import</span> VirtualizedTable <span class="kw">from</span> <span class="st">'./VirtualizedTable.svelte'</span>;
<span class="kw">&lt;/script&gt;</span>

<span class="kw">&lt;VirtualizedTable</span>
  <span class="at">data</span>={data}
  <span class="at">containerHeight</span>={600}
<span class="kw">/&gt;</span></pre>
        </div>

        <h3>All props</h3>

        <div class="code-wrap">
            <div class="code-header">
                <span class="code-lang">svelte</span>
                <button class="copy-btn" onclick="copyCode(this)">copy</button>
            </div>
            <pre><span class="kw">&lt;VirtualizedTable</span>
  <span class="at">data</span>={data2D}
  <span class="at">containerHeight</span>={tableHeight}
  <span class="at">rowHeight</span>={28}
  <span class="at">overscan</span>={5}
  <span class="at">rowBorderBottom</span>={true}
  <span class="at">cellBorderRight</span>={true}
  <span class="at">rowdblclick</span>={true}
  <span class="at">selectable</span>={true}
  <span class="at">fitData</span>={false}
  <span class="at">bind</span>:<span class="at">selectedRows</span>
  <span class="at">onRowDblClicked</span>={(row) => console.log(row)}
<span class="kw">/&gt;</span></pre>
        </div>

        <h3>Keyboard shortcuts</h3>
        <div class="kbd-grid">
            <div class="kbd-row">
                <span class="kbd-desc">Move focus</span>
                <span class="kbd-keys"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></span>
            </div>
            <div class="kbd-row">
                <span class="kbd-desc">Extend selection</span>
                <span class="kbd-keys"><kbd>Shift</kbd><kbd>↑↓←→</kbd></span>
            </div>
            <div class="kbd-row">
                <span class="kbd-desc">Jump to boundary</span>
                <span class="kbd-keys"><kbd>Ctrl</kbd><kbd>↑↓←→</kbd></span>
            </div>
            <div class="kbd-row">
                <span class="kbd-desc">Jump + extend</span>
                <span class="kbd-keys"><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>↑↓←→</kbd></span>
            </div>
            <div class="kbd-row">
                <span class="kbd-desc">Select all</span>
                <span class="kbd-keys"><kbd>Ctrl</kbd><kbd>A</kbd></span>
            </div>
            <div class="kbd-row">
                <span class="kbd-desc">Copy selection / all</span>
                <span class="kbd-keys"><kbd>Ctrl</kbd><kbd>C</kbd></span>
            </div>
            <div class="kbd-row">
                <span class="kbd-desc">First cell</span>
                <span class="kbd-keys"><kbd>Ctrl</kbd><kbd>Home</kbd></span>
            </div>
            <div class="kbd-row">
                <span class="kbd-desc">Last cell</span>
                <span class="kbd-keys"><kbd>Ctrl</kbd><kbd>End</kbd></span>
            </div>
            <div class="kbd-row">
                <span class="kbd-desc">Clear selection</span>
                <span class="kbd-keys"><kbd>Esc</kbd></span>
            </div>
        </div>
    </div>
</section>

<!-- Props -->
<section id="props">
    <div class="container">
        <div class="section-label">API</div>
        <h2>Props reference</h2>

        <table class="props-table">
            <thead>
                <tr>
                    <th>Prop</th>
                    <th>Type</th>
                    <th>Default</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>data</td>
                    <td><span class="tag">any[][]</span></td>
                    <td><span class="tag">[]</span></td>
                    <td>2D array. Row 0 = headers, rows 1–n = data.</td>
                </tr>
                <tr>
                    <td>containerHeight</td>
                    <td><span class="tag">number</span></td>
                    <td><span class="tag">400</span></td>
                    <td>Total height of the table in pixels. Set this to your layout height.</td>
                </tr>
                <tr>
                    <td>rowHeight</td>
                    <td><span class="tag">number</span></td>
                    <td><span class="tag">28</span></td>
                    <td>Height of each data row in pixels. All rows are fixed height.</td>
                </tr>
                <tr>
                    <td>overscan</td>
                    <td><span class="tag">number</span></td>
                    <td><span class="tag">5</span></td>
                    <td>Extra rows rendered above/below the viewport. Reduces blank flash on fast scroll.</td>
                </tr>
                <tr>
                    <td>rowBorderBottom</td>
                    <td><span class="tag">boolean</span></td>
                    <td><span class="tag">true</span></td>
                    <td>Show a bottom border on each row.</td>
                </tr>
                <tr>
                    <td>cellBorderRight</td>
                    <td><span class="tag">boolean</span></td>
                    <td><span class="tag">true</span></td>
                    <td>Show a right border on each cell.</td>
                </tr>
                <tr>
                    <td>fitData</td>
                    <td><span class="tag">boolean</span></td>
                    <td><span class="tag">false</span></td>
                    <td>When true, samples up to 500 rows to calculate column widths. When false, uses header text only (faster initial render).</td>
                </tr>
                <tr>
                    <td>selectable</td>
                    <td><span class="tag tag-bindable">$bindable</span></td>
                    <td><span class="tag">false</span></td>
                    <td>Shows a checkbox column for row selection.</td>
                </tr>
                <tr>
                    <td>selectedRows</td>
                    <td><span class="tag tag-bindable">$bindable</span></td>
                    <td><span class="tag">[]</span></td>
                    <td>Array of selected raw row arrays. Bind to read selections.</td>
                </tr>
                <tr>
                    <td>rowdblclick</td>
                    <td><span class="tag">boolean</span></td>
                    <td><span class="tag">false</span></td>
                    <td>Enables double-click on rows. Must be true for onRowDblClicked to fire.</td>
                </tr>
                <tr>
                    <td>onRowDblClicked</td>
                    <td><span class="tag">(row) => void</span></td>
                    <td><span class="tag">() => {}</span></td>
                    <td>Callback fired when a row is double-clicked. Receives the raw row array.</td>
                </tr>
            </tbody>
        </table>
    </div>
</section>

<!-- Performance -->
<section id="performance">
    <div class="container">
        <div class="section-label">Performance</div>
        <h2>Built for large datasets</h2>

        <p>The main design goal was eliminating the initial hang on new data. Here's what was done and why it matters.</p>

        <div class="perf-grid">
            <div class="perf-card">
                <h3>Row allocation</h3>
                <div class="perf-value">0 objects</div>
                <div class="perf-note">Rows stay as raw arrays. No <code>.map()</code> to objects.</div>
            </div>
            <div class="perf-card">
                <h3>Rendered rows at any time</h3>
                <div class="perf-value">~20–30</div>
                <div class="perf-note">Only visible rows + overscan are in the DOM.</div>
            </div>
            <div class="perf-card">
                <h3>Column width sample</h3>
                <div class="perf-value">≤ 500 rows</div>
                <div class="perf-note">Width estimation scans at most 500 rows per column.</div>
            </div>
            <div class="perf-card">
                <h3>Filter debounce</h3>
                <div class="perf-value">250 ms</div>
                <div class="perf-note">Filter derivation only runs after typing stops.</div>
            </div>
        </div>

        <div class="callout">
            <strong>Why 2D arrays?</strong> Converting each row to a named object costs
            one property assignment per cell — that's <strong>1 million assignments</strong>
            for 50k rows × 20 columns before a single pixel is rendered.
            Using numeric column indices (<code>row[i]</code>) as keys means
            the raw sub-arrays are used directly with zero transformation.
        </div>

        <h3>CSS Grid layout</h3>
        <p>
            Each row uses <code>display: grid</code> with a shared <code>grid-template-columns</code> string.
            This gives perfect column alignment without a table element, and avoids the per-row
            flex container overhead of the previous implementation.
        </p>

        <h3>Reactive design</h3>
        <p>
            Built with Svelte 5 runes. <code>$derived</code> chains mean filter → sort → virtualize
            only re-runs the affected stage when its inputs change. Sorting doesn't re-filter.
            Scrolling doesn't re-sort. Each stage is isolated.
        </p>

        <div class="code-wrap">
            <div class="code-header">
                <span class="code-lang">svelte</span>
            </div>
            <pre><span class="cm">// Data pipeline — each stage only reruns when its input changes</span>
<span class="kw">const</span> <span class="nm">rows</span>          = <span class="fn">$derived</span>(data.slice(<span class="st">1</span>));           <span class="cm">// zero cost</span>
<span class="kw">const</span> <span class="nm">filteredRows</span>  = <span class="fn">$derived.by</span>(() => rows.filter(...));  <span class="cm">// runs on filter change</span>
<span class="kw">const</span> <span class="nm">processedRows</span> = <span class="fn">$derived.by</span>(() => [...filteredRows]   <span class="cm">// runs on sort change</span>
                         .sort(...));
<span class="kw">const</span> <span class="nm">visibleRows</span>   = <span class="fn">$derived</span>(processedRows              <span class="cm">// runs on scroll</span>
                         .slice(startIdx, endIdx));</pre>
        </div>
    </div>
</section>

<!-- Footer -->
<div class="container">
    <footer>
        <span>VirtualizedTable — Svelte 5 component</span>
        <a href="https://github.com" target="_blank">GitHub ↗</a>
    </footer>
</div>

<script>
    function copyCode(btn) {
        const pre = btn.closest('.code-wrap').querySelector('pre');
        const text = pre.innerText;
        navigator.clipboard.writeText(text).then(() => {
            btn.textContent = 'copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'copy';
                btn.classList.remove('copied');
            }, 2000);
        });
    }
</script>

</body>
</html>
