<script lang="ts">
  import abcjs from 'abcjs';
  import 'abcjs/abcjs-audio.css';
  import { onMount } from 'svelte';

  onMount(() => {
    abcjs.renderAbc('s1-paper', "L:1/4\n | CDEF | GABc |\n defg | abc'z | ", {
      expandToWidest: true,
      scale: 2,
      dragging: true,
    });
    abcjs.renderAbc('s2-paper', 'L:1/4\n z/2 A,/2 | C2 B,2 | A, zz', {
      lineThickness: 0.3,
      responsive: 'resize',
      scale: 2,
      add_classes: true,
    });
    // meter: 3/8
    // default note length: 1/8
    // Spaces break beams
    abcjs.renderAbc('s3-paper', 'M:3/4\nL:1/8\n G2ee | e2c2ce | g3g fe | d2z2', {
      scale: 2,
      staffwidth: 840,
    });
  });
</script>

<section>
  <h3 class="mt-10 ml-4 text-lg font-bold">music scale</h3>
  <div id="s1-paper"></div>
</section>

<section>
  <h3 class="mt-10 ml-4 text-lg font-bold">note lengths</h3>
  <div id="s2-paper"></div>
</section>

<section>
  <h3 class="mt-10 ml-4 text-lg font-bold">beam line</h3>
  <div id="s3-paper"></div>
</section>

<section class="h-40 ml-4">
  <h3 class="mt-10 text-lg font-bold">references</h3>
  <ul>
    <li>https://paulrosen.github.io/abcjs/</li>
    <li>http://www.lesession.co.uk/abc/abc_notation.htm</li>
  </ul>
</section>

<style>
  :global {
    #s2-paper {
      .abcjs-clef {
        fill: '#dadada';
      }
      .abcjs-staff {
        fill: '#dadada';
      }
    }
  }
</style>
