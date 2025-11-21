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
  let m: ohm.Matcher;
  let mr: ohm.MatchResult;

  testText = test1;

  $effect(() => {
    try {
      abcGrammar = ohm.grammar(currentGrammarText);
      m = abcGrammar.matcher();
      m.setInput(testText);
      mr = m.match();
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

  let prettyPrintedText = $state('');
  function extract() {
    let bgColorMap = new Map([
      ["a", "bg-[var(--note-a-500)] hover:bg-[var(--note-a-600)]"],
      ["b", "bg-[var(--note-b-500)] hover:bg-[var(--note-b-600)]"],
      ["c", "bg-[var(--note-c-500)] hover:bg-[var(--note-c-600)]"],
      ["d", "bg-[var(--note-d-500)] hover:bg-[var(--note-d-600)]"],
      ["e", "bg-[var(--note-e-500)] hover:bg-[var(--note-e-600)]"],
      ["f", "bg-[var(--note-f-500)] hover:bg-[var(--note-f-600)]"],
      ["g", "bg-[var(--note-g-500)] hover:bg-[var(--note-g-600)]"],
    ]);
    let dotted = 0;
    if (!abcGrammar) return;
    const semantics = abcGrammar.createSemantics().addOperation('extract', {
      _nonterminal(...children) {
        return children.map(c => c.extract()).join('');
      },
      _terminal() {
        return '';
      },
      _iter(...children) {
        return children.map(c => c.extract()).join('');
      },
      TuneBook(a1, _a2, _a3, a4, _a5) {
        let output = `<div class="tune my-4">${a1.extract()}</div>`;
        a4.children.forEach(c => {
           output += `<div class="tune my-4">${c.extract()}</div>`;
        });
        return output;
      },
      reservedCommonField_meter(_a1, _a2, _a3) {
        return '';
      },
      reservedCommonField_unitNoteLength(_a1, _a2, _a3) {
        return '';
      },
      reservedInBodyFieldX_key(_a1, _a2, _a3) {
        return '';
      },
      reservedInlineFieldX_key(_a1, _a2, _a3) {
        return '';
      },
      binaryOp_broken(a) {
        if (a.sourceString.indexOf(">") != -1) {
          dotted = a.sourceString.length;
        } else {
          dotted = -a.sourceString.length;
        }
        return '';
      },
      NoteSeq_binary(a1, a2, a3) {
        let output = '';
        // set dotted in a2 action
        a2.extract();
        output = a1.extract();
        dotted = -dotted;
        output += a3.extract();
        dotted = 0;
        return output;
      },
      NoteSeq_dotted(a1, a2) {
        let output = '';
        // set dotted in a2 action
        a2.extract();
        output = a1.extract();
        dotted = 0;
        return output;
      },
      baseNote(_accidental, noteName, _octave, dura) {
        let output = '';
        // if (accidental.numChildren > 0) output += accidental.sourceString;
        output += `<span class="text-base text-white">${noteName.sourceString}</span>`;
        // if (octave.numChildren > 0) output += octave.sourceString;
        let noteWidth = 32;
        if (dura.numChildren > 0) {
          let fra = dura.extract().split('/');
          noteWidth = fra[0] * noteWidth / fra[1];
        }
        let s = 0;
        for (let i = 1; i <= Math.abs(dotted); i++) {
          s += Math.pow(2, -i);
        }
        noteWidth += ((dotted > 0) ? 1 : -1) * noteWidth * s;
        let bgColor = bgColorMap.get(noteName.sourceString.toLowerCase()) ?? 'bg-[var(--note-black-600)] hover:bg-[var(--note-black-700)]';
        output = `<div class="inline-block ${bgColor}" style="width:${noteWidth}px">${output}</div>`;
        return output;
      },
      noteLen_fra(a1, _, a2) {
        return a1.sourceString + "/" + a2.sourceString;
      },
      noteLen_div(_a1, a2) {
        return "1/" + a2.sourceString;
      },
      noteLen_half(a1) {
        return "1/" + a1.sourceString.length;
      },
      noteLen_mul(a) {
        return a.sourceString + "/1";
      },
      graceNote(_a1, _a2, _a3, _a4, _a5) {
        return '';
      },
    });
    prettyPrintedText = semantics(mr).extract();
  }
</script>

<div class="flex flex-col justify-center items-center w-[calc(100vw-20px)] h-screen">
  <!-- top editor -->
  <div class={`flex w-full ${toTop ? 'h-1/4' : 'h-3/4'} px-1 pt-4 transition-height ease-out duration-150`}>
    <!-- grammar editor -->
    <div bind:this={grammarRef} class={`grammar ${minRight ? 'w-full' : minLeft ? 'w-0' : 'w-1/2'} h-full flex flex-col overflow-auto transition-width ease-out duration-150`}></div>
    <!-- window handle bar -->
    <div class="flex flex-col handle w-2 h-full bg-border">
      <button class="left w-full h-full text-[8px] flex items-center justify-center hover:bg-[var(--app-color-150)] hover:text-base" onclick={toggleExpandToLeft} aria-label="expand left">
        {minLeft ? '⇒' : '⇐'}
      </button>
      <button class="right w-full h-full text-[8px] flex items-center justify-center hover:bg-[var(--app-color-150)] hover:text-base" onclick={toggleExpandToRight} aria-label="expand right">
        {minRight ? '⇐' : '⇒'}
      </button>
    </div>
    <!-- test window -->
    <div class={`test ${minLeft ? 'w-full' : minRight ? 'w-0' : 'w-1/2'} h-full flex flex-col overflow-auto transition-width ease-out duration-150`}>
      <div class="max-h-3/4 overflow-auto" bind:this={testRef}></div>
      <hr class="my-2" />
      {#if testText.length > 0}
        <div class="p-2 max-h-1/2 overflow-auto">
          <button class="h-8 ml-1 ring-2 text-base text-bold px-1 ring-[var(--app-color-500)]
            hover:bg-[var(--app-color-100)] active:bg-[var(--app-color-150)] active:scale-98"
            onclick={extract}>note only</button>
          <div>{@html prettyPrintedText}</div>
        </div>
      {/if}
    </div>
  </div>
  <!-- window handle bar -->
  <button class="w-full h-2 bg-border text-[8px] flex items-center justify-center font-bold
    hover:bg-[var(--app-color-150)] hover:text-base" onclick={toggleExpandToTop} aria-label="expand top">↕</button>
  <!-- result window -->
  <div class={`flex w-full flex-col ${toTop ? 'h-3/4' : 'h-1/4'} p-8 transition-height ease-out duration-150`}>
    <div>
      <a class="text-gray-400" target="_blank" href="https://abcnotation.com/wiki/abc:standard:v2.1" title="abc standard">https://abcnotation.com/wiki/abc:standard:v2.1</a> <br/>
      <a class="text-gray-400" target="_blank" href="https://ohmjs.org/docs/syntax-reference" title="ohm syntax reference">https://ohmjs.org/docs/syntax-reference</a><br />
      <a class="text-gray-400" target="_blank" href="https://ohmjs.org/editor/" title="ohm syntax reference">https://ohmjs.org/editor/</a><br />
      <a class="text-gray-400" target="_blank" href="https://editor.drawthedots.com/" title="abc editor by abcjs">https://editor.drawthedots.com/</a>
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
