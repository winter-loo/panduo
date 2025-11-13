<script lang="ts">
  import * as ohm from 'ohm-js';
  import abcNotation from './abc.ohm?raw';
  import test1 from './testdata/1.txt?raw';
  import { onMount } from 'svelte';
  import { basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { EditorView } from '@codemirror/view';

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

  function debounce<F extends (...args: any[]) => void>(fn: F, delay: number) {
    let timer: number | undefined;
    return (...args: Parameters<F>) => {
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), delay);
    };
  }

  const onDebouncedUpdate = debounce((view: EditorView) => {
    // console.log("Debounced update:", view.state.doc.toString());
    let updatedText = view.state.doc.toString();
    if (view == grammarView) {
      currentGrammarText = updatedText;
    } else if (view == testView) {
      testText = updatedText;
    }
  }, 500); // 500ms delay after last input

  let grammarRef = $state();
  let testRef = $state();
  let grammarView: EditorView;
  let testView: EditorView;
  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onDebouncedUpdate(update.view);
      }
    });
    const grammarEditingState = EditorState.create({
      doc: currentGrammarText,
      extensions: [basicSetup, updateListener],
    });
    grammarView = new EditorView({
      state: grammarEditingState,
      parent: grammarRef! as Element,
    });
    const textEditingState = EditorState.create({
      doc: testText,
      extensions: [basicSetup, updateListener],
    });
    testView = new EditorView({
      state: textEditingState,
      parent: testRef! as Element,
    });

    return () => {
      grammarView.destroy();
      testView.destroy();
    };
  });

  let minLeft = $state(false);
  let minRight = $state(false);
  function toggleExpandToLeft() {
    minLeft = !minLeft;
  }

  function toggleExpandToRight() {
    minRight = !minRight;
  }

  let toTop = $state(false);
  function toggleExpandToTop() {
    toTop = !toTop;
  }

  let showTrace = $state(false);
  $effect(() => {
    if (showTrace && abcGrammar) {
      if (testText.length < 100)
        traceOutput = abcGrammar.trace(testText).toString();
      else
        traceOutput = "input text is too long to trace, max: 100";
    }
  });
</script>

<div class="flex flex-col justify-center items-center w-[calc(100vw-20px)] h-screen">
  <div class={`flex w-full ${toTop ? 'h-1/4' : 'h-3/4'} px-1 pt-4 transition-height ease-out duration-150`}>
    <div bind:this={grammarRef} class={`grammar ${minRight ? 'w-full' : minLeft ? 'w-0' : 'w-1/2'} h-full flex flex-col overflow-auto transition-width ease-out duration-150`}></div>
    <div class="flex flex-col handle w-2 h-full bg-border">
      <button class="left w-full h-full text-[8px] flex items-center justify-center hover:bg-[var(--app-color-150)] hover:text-base" onclick={toggleExpandToLeft} aria-label="expand left">
        {minLeft ? '⇒' : '⇐'}
      </button>
      <button class="right w-full h-full text-[8px] flex items-center justify-center hover:bg-[var(--app-color-150)] hover:text-base" onclick={toggleExpandToRight} aria-label="expand right">
        {minRight ? '⇐' : '⇒'}
      </button>
    </div>
    <div bind:this={testRef} class={`test ${minLeft ? 'w-full' : minRight ? 'w-0' : 'w-1/2'} h-full flex flex-col overflow-auto transition-width ease-out duration-150`}></div>
  </div>
  <button class="w-full h-2 bg-border text-[8px] flex items-center justify-center font-bold
    hover:bg-[var(--app-color-150)] hover:text-base" onclick={toggleExpandToTop} aria-label="expand top">↕</button>
  <div class={`flex w-full flex-col ${toTop ? 'h-3/4' : 'h-1/4'} p-8 transition-height ease-out duration-150`}>
    <div>
      <a class="text-gray-400" target="_blank" href="https://abcnotation.com/wiki/abc:standard:v2.1" title="abc standard">https://abcnotation.com/wiki/abc:standard:v2.1</a> <br/>
      <a class="text-gray-400" target="_blank" href="https://ohmjs.org/docs/syntax-reference" title="ohm syntax reference">https://ohmjs.org/docs/syntax-reference</a>
    </div>
    <hr />
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
