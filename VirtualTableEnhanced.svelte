<script>
  let items = [];
  let editableCell = null;

  function handleCellClick(rowIndex, colIndex) {
    console.log(`Cell clicked: Row ${rowIndex}, Column ${colIndex}`);
  }

  function handleCellDoubleClick(rowIndex, colIndex) {
    editableCell = { rowIndex, colIndex };
    console.log(`Cell double clicked: Row ${rowIndex}, Column ${colIndex}`);
  }

  function handleRowHover(rowIndex) {
    console.log(`Row hovered: Row ${rowIndex}`);
  }

  function handleContextMenu(event, rowIndex, colIndex) {
    event.preventDefault();
    console.log(`Context menu opened on Row ${rowIndex}, Column ${colIndex}`);
  }

  function handleColumnResize(columnIndex, newWidth) {
    console.log(`Column ${columnIndex} resized to ${newWidth}`);
  }

  // Add your event listeners or other logic here
</script>

<style>
  /* Add your styles here */
</style>

<template>
  <table>
    {#each items as item, rowIndex}
      <tr on:mouseover={() => handleRowHover(rowIndex)}>
        {#each Object.keys(item) as colKey, colIndex}
          <td
            on:click={() => handleCellClick(rowIndex, colIndex)}
            on:dblclick={() => handleCellDoubleClick(rowIndex, colIndex)}
            on:contextmenu={(event) => handleContextMenu(event, rowIndex, colIndex)}
          >
            {editableCell && editableCell.rowIndex === rowIndex && editableCell.colIndex === colIndex ?
              <input type="text" bind:value={item[colKey]}>
              : item[colKey]}
          </td>
        {/each}
      </tr>
    {/each}
  </table>
  <div>
    <!-- Include any resize handlers or controls here -->
  </div>
</template>
