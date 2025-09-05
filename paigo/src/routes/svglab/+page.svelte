<script lang="ts">
  let length = $state(50);

</script>
<svg width="200" height="200" viewBox="0 0 {length} {length}">
  <circle cx={length/2} cy={length/2} r="25" fill="skyblue"/>
</svg>

<button onclick={() => length += 5}>zoom out</button>
<button onclick={() => length -= 5}>zoom in</button>
