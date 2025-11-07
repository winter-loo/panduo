<script lang="ts">
  import abcjs from '$lib/abcjs/index';
  import { onMount } from 'svelte';
  console.log('tune object array: ', abcjs.parseOnly("L:1/4\n | CDEF | GABc \n| d[efg] | abc'z |"));

  const grandStaff = `
  X:1
T:Grand Staff Example
M:4/4
L:1/4
K:C
%%staves {V:1 V:2}
V:1 clef=treble
V:2 clef=bass
V:1
C D E F | G A B c |
V:2
C, D, E, F, | G, A, B, C
  `;

  let staffRef;
  onMount(() => {

  console.log('tune object array: ', abcjs.renderAbc(staffRef!, grandStaff));
  })
</script>

<div id="staff" bind:this={staffRef}></div>
