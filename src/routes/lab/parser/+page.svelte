<script lang="ts">
  import * as ohm from 'ohm-js';
  import abcNotation from './abc.ohm?raw';
  import test1 from './testdata/1.txt?raw';
  import { onMount } from 'svelte';
  import {basicSetup, EditorView} from 'codemirror';

  let currentGrammarText = $state(abcNotation);
  let testText = $state('X:1\nK:D\n[CEG]->[CEG]');
  let traceOutput = $state('');
  let resultMessage = $state('');
  let abcGrammar: ohm.Grammar;

  testText = test1;

  $effect(() => {
    try {
      abcGrammar = ohm.grammar(currentGrammarText);
      const mr = abcGrammar.match(testText);
      if (mr.failed()) {
        resultMessage = mr.message!;
      } else {
        resultMessage = `matched, input text length ${testText.length}`;
      }
    } catch (e) {
      if (e instanceof Error)
        resultMessage = 'Grammar Error: ' + e.message;
      else
        resultMessage = 'Unknown Grammar Error: ' + e;
    }
  });

  let grammarRef = $state();
  let testRef = $state();
  onMount(() => {
    // TODO: how to trigger an change event after some delay
    const grammarView = new EditorView({
      doc: currentGrammarText,
      parent: grammarRef! as Element,
      extensions: [basicSetup]
    });
    const testView = new EditorView({
      doc: testText,
      parent: testRef! as Element,
      extensions: [basicSetup]
    });
  })

  let minLeft = $state(false);
  let minRight = $state(false);
  function toggleExpandToLeft() {
    minLeft = !minLeft;
  }

  function toggleExpandToRight() {
    minRight = !minRight;
  }

  let showTrace = $state(false);
  $effect(() => {
    if (showTrace && abcGrammar) {
      if (testText.length < 400)
        traceOutput = abcGrammar.trace(testText).toString();
      else
        traceOutput = "input text is too long enough to trace";
    }
  });
</script>

<div class="flex flex-col justify-center items-center w-[calc(100vw-20px)] h-screen">
  <div class="flex w-full h-3/4 px-1 py-4">
    <div bind:this={grammarRef} class={`grammar ${minRight ? 'w-full' : minLeft ? 'w-0' : 'w-1/2'} h-full flex flex-col overflow-auto transation-width ease-out duration-150`}></div>
    <div class="flex flex-col handle w-2 h-full bg-[var(--app-color-100)]">
      <button class="left w-full h-full text-[8px] text-center hover:bg-[var(--app-color-150)]" onclick={toggleExpandToLeft} aria-label="expand left">
        {minLeft ? '>' : '<'}
      </button>
      <button class="right w-full h-full text-[8px] text-center hover:bg-[var(--app-color-150)]" onclick={toggleExpandToRight} aria-label="expand right">
        {minRight ? '<' : '>'}
      </button>
    </div>
    <div bind:this={testRef} class={`test ${minLeft ? 'w-full' : minRight ? 'w-0' : 'w-1/2'} h-full flex flex-col overflow-auto transation-width ease-out duration-150`}></div>
  </div>
  <div class="flex w-full flex-col h-1/4 p-8 border-t-4">
    {#if resultMessage.length > 0}
      <pre class="text-red-500 text-base text-wrap">{resultMessage}</pre>
      <button onclick={() => (showTrace = !showTrace)}>show trace</button>
    {/if}
    {#if showTrace}
      <hr />
      <pre class="max-h-fit overflow-auto">{traceOutput}</pre>
    {/if}
  </div>
</div>
