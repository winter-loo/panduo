<script lang="ts">
  import { onMount } from 'svelte';

  let length = $state(50);

  let outputContainer: HTMLElement;
  onMount(() => {
    const svgNS = 'http://www.w3.org/2000/svg';

    let svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');

    let rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '20');
    rect.setAttribute('width', '50');
    rect.setAttribute('height', '50');
    rect.setAttribute('fill', '#aa7777');

    svg.appendChild(rect);

    outputContainer.appendChild(svg);
  });
</script>

<svg width="200" height="200" viewBox="0 0 {length} {length}">
  <circle cx={length / 2} cy={length / 2} r="25" fill="skyblue" />
</svg>

<div class="output" bind:this={outputContainer}></div>

<button onclick={() => (length += 5)}>zoom out</button>
<button onclick={() => (length -= 5)}>zoom in</button>
