<script lang="ts">
  interface Keyframe {
    id: number;
    rotate: number;
    translateX: number;
    translateY: number;
    scale: number;
    skewX: number;
    skewY: number;
    transformOrigin: string;
  }

  let rotate = 0;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let skewX = 0;
  let skewY = 0;
  let transformOrigin = 'center';

  let keyframes: Keyframe[] = [];
  let animationName = '';
  let animationKeyframes = '';

  $: transformValue = `
    translateX(${translateX}px)
    translateY(${translateY}px)
    rotate(${rotate}deg)
    scale(${scale})
    skewX(${skewX}deg)
    skewY(${skewY}deg)
  `;

  function addKeyframe() {
    keyframes = [
      ...keyframes,
      {
        id: Date.now(),
        rotate,
        translateX,
        translateY,
        scale,
        skewX,
        skewY,
        transformOrigin,
      },
    ];
  }

  function removeKeyframe(id: number) {
    keyframes = keyframes.filter((k) => k.id !== id);
  }

  function playAnimation() {
    if (keyframes.length < 2) {
      alert('You need at least 2 keyframes to create an animation.');
      return;
    }

    const keyframeSteps = keyframes
      .map((k, i) => {
        const percentage = (i / (keyframes.length - 1)) * 100;
        const transform = `
          translateX(${k.translateX}px)
          translateY(${k.translateY}px)
          rotate(${k.rotate}deg)
          scale(${k.scale})
          skewX(${k.skewX}deg)
          skewY(${k.skewY}deg)
        `;
        return `
        ${percentage}% {
          transform: ${transform.trim()};
          transform-origin: ${k.transformOrigin};
        }
      `;
      })
      .join('');

    animationName = `smart-animation-${Date.now()}`;
    animationKeyframes = `
      @keyframes ${animationName} {
        ${keyframeSteps}
      }
    `;

    // Reset animation to replay
    const box = document.querySelector('.box');
    if (box) {
      box.style.animation = 'none';
      // This is a hack to force a reflow, which is necessary for the animation to restart.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = box.offsetWidth;
      box.style.animation = `${animationName} 2s linear infinite`;
    }
  }

  function resetAnimation() {
    const box = document.querySelector('.box');
    if (box) {
      box.style.animation = '';
    }
    animationName = '';
    animationKeyframes = '';
  }

  function resetKeyframes() {
    keyframes = [];
    resetAnimation();
  }
</script>

<svelte:head>
  {@html `<style>${animationKeyframes}</style>`}
</svelte:head>

<main>
  <div class="controls-and-keyframes">
    <h1>CSS Transform Lab</h1>

    <div class="controls">
      <label>
        rotate: {rotate}deg
        <input type="range" bind:value={rotate} min="-360" max="360" />
      </label>
      <label>
        translateX: {translateX}px
        <input type="range" bind:value={translateX} min="-100" max="100" />
      </label>
      <label>
        translateY: {translateY}px
        <input type="range" bind:value={translateY} min="-100" max="100" />
      </label>
      <label>
        scale: {scale}
        <input type="range" bind:value={scale} min="0.1" max="3" step="0.1" />
      </label>
      <label>
        skewX: {skewX}deg
        <input type="range" bind:value={skewX} min="-90" max="90" />
      </label>
      <label>
        skewY: {skewY}deg
        <input type="range" bind:value={skewY} min="-90" max="90" />
      </label>
      <label>
        transform-origin:
        <select bind:value={transformOrigin}>
          <option value="center">center</option>
          <option value="top left">top left</option>
          <option value="top right">top right</option>
          <option value="bottom left">bottom left</option>
          <option value="bottom right">bottom right</option>
          <option value="50% 50%">50% 50%</option>
          <option value="0 0">0 0</option>
          <option value="100% 100%">100% 100%</option>
        </select>
      </label>
    </div>

    <div class="keyframe-controls">
      <button on:click={addKeyframe}>Add Keyframe</button>
      <button on:click={playAnimation} disabled={keyframes.length < 2}>Play Animation</button>
      <button on:click={resetKeyframes}>Reset Keyframes</button>
    </div>

    <div class="keyframes-list">
      <h2>Keyframes</h2>
      {#each keyframes as k (k.id)}
        <div class="keyframe">
          <pre><code>{JSON.stringify(
            {
              ...k,
              id: undefined,
            },
            null,
            2,
          )}</code></pre>
          <button on:click={() => removeKeyframe(k.id)}>X</button>
        </div>
      {/each}
    </div>
  </div>

  <div class="playground">
    <div
      class="box"
      style="transform: {transformValue}; transform-origin: {transformOrigin}; animation-name: {animationName};"
    ></div>
  </div>

  <div class="code">
    <pre><code>transform: {transformValue.trim()};</code></pre>
    <pre><code>transform-origin: {transformOrigin};</code></pre>
  </div>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 2rem;
    padding: 2rem;
    height: 100vh;
  }

  .controls-and-keyframes {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
  }

  .keyframe-controls {
    display: flex;
    gap: 1rem;
  }

  .keyframes-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .keyframe {
    position: relative;
    background-color: #f9f9f9;
    padding: 1rem;
    border-radius: 5px;
    border: 1px solid #eee;
  }

  .keyframe button {
    position: absolute;
    top: 5px;
    right: 5px;
    background: #eee;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
  }

  .playground {
    display: grid;
    place-items: center;
    border: 1px solid #ccc;
    background-color: #f0f0f0;
  }

  .box {
    width: 100px;
    height: 100px;
    background-color: deeppink;
    transition: transform 0.2s ease-out;
    animation-duration: 2s;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
  }

  .code {
    grid-column: 1 / -1;
    background-color: #eee;
    padding: 1rem;
    border-radius: 5px;
    white-space: pre-wrap;
  }
</style>
