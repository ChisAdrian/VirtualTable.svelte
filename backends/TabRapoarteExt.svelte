<script>
    import { onMount } from "svelte";
    import { runReadQuery } from "./backends/mssql";
    import VirtualTable from "./lib/VirtualTable.svelte";
    import { runReadQueryORACLE } from "./backends/oraclesql";

    const TABLE_HEIGHT_OFFSET = 80; // Configurable offset for table height

    let readError = $state("");
    let selectQ = $state([]);

    let searchQuery = $state("");
    let searchMenu = $state(false);
    let allQueries = $state([]);
    let selectedQuery = $state("");
    function selectQuery(query_row) {
        searchQuery = query_row.at(0);
        selectedQuery = query_row.at(1).replace(/<br\s*\/?>/gi, "\n");
        searchMenu = false;
        showMenuLeft = false;
        console.log(query_row);
    }

    let filteredQueries = $derived(
        allQueries.slice(1).filter((query_row) => {
            return query_row[0]
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
        }),
    );

    onMount(() => {
        let resizeObserver;

        // Async logic for fetching queries
        (async () => {
            let readResults;
            let sql = `SELECT 
                        Name,
                        REPLACE(REPLACE(SQL_TXT, CHAR(13) + CHAR(10), '<br/>'), CHAR(10), '<br/>') AS SQL_TXT
                    FROM ALEX_EXT.dbo.SAVED_Queries
                   ;`;
            try {
                const data = await runReadQuery(sql);
                readResults = data;
                if (readResults.length > 0) {
                    selectQ = $state.snapshot(readResults);
                    allQueries = $state.snapshot(readResults);
                    console.log("allQueries", allQueries);
                }
            } catch (error) {
                readError = error.message;
                return;
            }
        })();

        // Initialize ResizeObserver for container resizing
        if (container) {
            resizeObserver = new ResizeObserver(() => {
                containerHeight = container.getBoundingClientRect().height;
            });
            resizeObserver.observe(container);
        }

        // Cleanup function
        return () => {
            if (resizeObserver) resizeObserver.disconnect();
        };
    });

    let selectedQ = $state("");

    let data2D = $state([]);
    let queriesrunning = $state(false);

    async function executeQuery(backend) {
        readError = "";
        const sql = selectedQuery;

        if (!isReadOnlyQuery(sql)) {
            readError = "Only read-only queries are allowed.";
            queriesrunning = false;
            return;
        }
        if (!sql.trim()) {
            queriesrunning = false;
            return;
        }
        queriesrunning = true;
        data2D = [];
        let readResults = [];
        try {
            const data = await (
                backend === "mssql" ? runReadQuery : runReadQueryORACLE
            )(sql);
            readResults = data;
            readResults = readResults.filter((row) =>
                Object.values(row).some((val) => val !== null && val !== ""),
            );
            if (readResults.length > 0) {
                data2D = $state.snapshot(readResults);
            } else {
                data2D = [["No data"], ["No data"]];
            }
        } catch (error) {
            readError = error.message;
        } finally {
            queriesrunning = false;
        }
    }

    function isReadOnlyQuery(query) {
        const q = query.toUpperCase().replace(/\s+/g, " ");
        const forbidden = [
            "ALTER",
            "INSERT",
            "EXECUTE",
            "EXEC",
            "UPDATE",
            "DELETE",
            "DROP",
            "CREATE",
            "TRUNCATE",
            "MERGE",
            "REPLACE",
            "GRANT",
            "REVOKE",
            "DENY",
            "USE",
        ];
        return !forbidden.some((word) => {
            const regex = new RegExp("\\b" + word + "\\b", "i");
            return regex.test(q);
        });
    }

    let splitterY = $state(15); // Initial splitter position (15% of container height)
    let isDragging = $state(false);
    let containerHeight = $state(0);
    let container; // Reference to the container

    // Start dragging
    function startDrag(event) {
        isDragging = true;
        containerHeight = container.getBoundingClientRect().height;
    }

    // Handle drag movement
    function onDrag(event) {
        if (!isDragging) return;
        const newY = event.clientY - container.getBoundingClientRect().top;
        splitterY = Math.max(20, Math.min(80, (newY / containerHeight) * 100)); // Clamp between 20% and 80%
    }

    // Stop dragging
    function stopDrag() {
        isDragging = false;
    }

    let tableHeight = $state(100);
    $effect(() => {
        if (splitterY) {
            const remainingPec = 1 - splitterY / 100;
            tableHeight = containerHeight * remainingPec - TABLE_HEIGHT_OFFSET;
        }
    });

    // Update container height on initial mount
    $effect(() => {
        if (container) {
            containerHeight = container.getBoundingClientRect().height;
        }
    });
    let sqlParams = $state();

    function formatToSQLInClause() {
        // Split input by newlines, trim whitespace, and filter out empty lines
        const strings = sqlParams
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line !== "");

        // Wrap each string in single quotes
        const formattedStrings = strings.map((str) => `'${str}'`);

        // Join with commas and wrap in IN clause
        return formattedStrings.length > 0
            ? `IN (${formattedStrings.join(", ")})`
            : "IN ()";
    }

    function sqlParamsHelper() {
        const result = formatToSQLInClause();
        navigator.clipboard.writeText(result);
    }

    let showMenuLeft = $state(false);
    let searchInput;
</script>

<dialog class="left {showMenuLeft ? 'active' : ''}">
    <nav class="right-align">
        <button onclick={() => (showMenuLeft = false)} class="border"
            ><i>close</i>
        </button>
    </nav>

    <div class="field label" style="position: relative;">
        <input
            bind:this={searchInput}
            class="small-padding no-round max"
            type="text"
            bind:value={searchQuery}
            placeholder="Search report..."
            onfocus={() => (searchMenu = true)}
            onblur={() => setTimeout(() => (searchMenu = false), 200)}
        />

        <menu class="min {searchMenu ? 'active' : ''}">
            <li>
                <div
                    class="field surface border fixed"
                    style="width: 90%; z-index:100"
                >
                    <input bind:value={searchQuery} />
                </div>
            </li>
            <div class="surface vertcial">
                {#each filteredQueries as row}
                    <button
                        class="responsive transparent no-margin no-round"
                        onclick={() => selectQuery(row)}
                    >
                        {row[0]}
                    </button>
                    <hr />
                {/each}
            </div>
        </menu>
    </div>
</dialog>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="max"
    bind:this={container}
    style="height: 97vh; width: 100%; display: flex; flex-direction: column;"
    onmousemove={onDrag}
    onmouseup={stopDrag}
>
    <div class="top-pane" style="height: {splitterY}%; overflow: auto;">
        <div class="row small-padding no-round" style="height: 100%;">
            <nav class="group vertical small tiny-space">
                <button
                    class="tertiary responsive"
                    onclick={() => {
                        showMenuLeft = !showMenuLeft;
                        searchQuery = "";
                    }}><i>menu_book</i></button
                >
                <button
                    onclick={() => executeQuery("mssql")}
                    class="left-round small border surface-dim responsive"
                    data-ui=""
                >
                    Extens_Q
                </button>
                <button
                    onclick={() => executeQuery("oracle")}
                    class="left-round small border responsive"
                    data-ui=""
                >
                    Flex__Q
                </button>
            </nav>

            <!--<div class="vertical" style="min-width: 450px;">
                 <div class="field label" style="position: relative;">
                    <input
                        class="small-padding no-round max"
                        type="text"
                        bind:value={searchQuery}
                        placeholder="Caută user..."
                        onfocus={() => (searchMenu = true)}
                        onblur={() =>
                            setTimeout(() => (searchMenu = false), 200)}
                    />

                    <menu class="min {searchMenu ? 'active' : ''}">
                        <li>
                            <div class="field large">
                                <input bind:value={searchQuery} />
                            </div>
                        </li>

                        {#each filteredQueries as row}
                            <button
                                class="responsive border transparent small-margin"
                                onclick={() => selectQuery(row)}
                            >
                                {row[0]}
                            </button>
                        {/each}
                    </menu>
                </div>

                <div class="row max">
                    <nav class="group small center-align tiny-space">
                        <button
                            onclick={() => executeQuery("mssql")}
                            class="left-round small primary"
                            data-ui=""
                        >
                            Extens_Q
                        </button>
                        <button
                            onclick={() => executeQuery("oracle")}
                            class="right-round small secondary"
                            data-ui=""
                        >
                            Flex__Q
                        </button>
                    </nav>
                </div>
            </div>-->
            <!--<div class="vertical">
                <div class="field label">
                    <select bind:value={selectedQ}>
                        {#if selectQ.length > 1}
                            {#each selectQ as row}
                                <option value={row.at(1)}>{row.at(0)}</option>
                            {/each}
                        {/if}
                    </select>
                    <label for="">Select</label>
                    <nav class="group small center-align tiny-space">
                        <button
                            onclick={() => executeQuery("mssql")}
                            class="left-round small primary"
                            data-ui=""
                        >
                            Extens_Q
                        </button>
                        <button
                            onclick={() => executeQuery("oracle")}
                            class="right-round small secondary"
                            data-ui=""
                        >
                            Flex__Q
                        </button>
                    </nav>
                    <div class="row no-space">
                        <textarea
                            style="resize: none; "
                            class="transparent left-round"
                            bind:value={sqlParams}
                        ></textarea>

                        <button
                            onclick={() => sqlParamsHelper()}
                            class="right-round small transparent"
                            data-ui=""
                        >
                            <i>article_shortcut</i>
                        </button>
                    </div>
                </div>
            </div>-->
            {#if readError}
                <div
                    class="error-message max"
                    style="color: red; padding: 5px;"
                >
                    {readError}
                </div>
            {/if}
            <textarea
                class="small-padding max no-round left-align background"
                style="width: 100%; resize: none; height: 100%; white-space: pre-wrap;"
                bind:value={selectedQuery}
            ></textarea>
        </div>
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="row small border small-margin splitter" onmousedown={startDrag}>
        <hr />
    </div>

    {#if data2D.length > 0}
        <VirtualTable
            containerHeight={((100 - splitterY) * containerHeight) / 100 -
                TABLE_HEIGHT_OFFSET}
            data={data2D}
        />
    {:else if queriesrunning}
        <progress class="light-green-text"></progress>
    {/if}
</div>

<style>
    .splitter {
        width: 100%;
        height: 5px;
        background-color: #ccc;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .splitter:hover {
        cursor: ns-resize;
    }
    .splitter hr {
        width: 100%;
        border: 0;
        height: 1px;
        background: #000;
        margin: 0;
    }
    textarea {
        box-sizing: border-box;
    }
    .error-message {
        font-size: 14px;
        text-align: center;
    }
</style>
