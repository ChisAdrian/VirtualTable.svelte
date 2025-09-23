# VirtualTable.svelte
<p>Suport for large datasets </p>
<p>Select via mouse move or keys </p>
<p>Copy </p>
<p>  Made with AI and  .... patience </p>
<code>  
  //Usage
  <script>
    let data2D = $state([[], []]);     
    let tableHeight = $state(220);  
  </script>

  </code>


   <  VirtualTable containerHeight={tableHeight} data={data2D}  >
      

