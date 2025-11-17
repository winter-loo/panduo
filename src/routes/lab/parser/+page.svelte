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

  let reducedText = $state('');
  function reduce() {
    debugger;
    if (!abcGrammar) return;
    const semantics = abcGrammar.createSemantics().addOperation('reduce', {
      _terminal() {
        return '';
      },
     _iter(...children) {
        return children.map(c => c.reduce());
      },

      File(_1, fh, _2, _3, tunebook) {
        debugger;
        return fh.reduce().concat(tunebook.reduce());
      },
      FileHeaders(a, _, b) {
        return a.reduce() + b.reduce();
      },
      FileHeader(a) {
        return a.reduce();
      },
      FileHeader_unknown(_) {
        return '';
      },
      TuneBook(tune, _1, _2, atune, _4) {
        return tune.reduce() + "\n\n" + atune;
      },
      Tune(a, _, b) {
        return a.reduce() + "\n" + b.reduce();
      },
      TuneHeader(a1, _a2, a3, _a4, a5) {
        return a1.reduce() + a3.reduce() + a5.reduce();
      },
      TuneHeaderStartField(_x, n) {
        return 'X:'.concat(n.sourceString.trim());
      },
      TuneHeaderEndField(_k, v) {
        return 'K:'.concat(v.sourceString.trim());
      },
      TuneHeaderMiddleField(a) {
        return a.reduce();
      },
      TuneHeaderMiddleField_unknown(_) {
        return '';
      },

      TuneBody(a, _, b, _2, c, _3, d) {
        return a.reduce();
      },

      TuneBodyPart(a) {
        return a.reduce();
      },

      TuneBodyPart_inline(a) {
        return a.reduce();
      },

      TuneBodyPart_middle(a, _, b, _2, c) {
        return a.reduce() + "\n" + b.reduce() + "\n" + c.reduce();
      },

      MusicCode(a) {
        return a.reduce();
      },

      MusicCodePart_noteseq(a) {
        return a.reduce();
      },

      NoteSeq(a) {
        return a.reduce();
      },

      NoteSeq_dotted(a, _) {
        return a.recue() + ">";
      },

      NoteSeq_pairedAnnotation(a) {
        return a.reduce();
      },

      NoteSeq_group(a) {
        return a.reduce();
      },

      NoteSeq_binary(a, b, c) {
        return a.reduce() + b.reduce() + c.reduce();
      },

      BaseNoteGroup(a) {
        return a.reduce();
      },

      BaseNoteGroup_chord(_, a, _2) {
        return "[" + a.reduce() + "]";
      },

      BaseNoteGroup_nplet(_, a, b) {
        return "(" + a.reduce() + b.reduce();
      },

      BaseNoteGroup_binary(a, b, c) {
        return a.reduce() + b.reduce() + c.reduce();
      },

      NoteGroup(a, b) {
        return a.reduce() + b.reduce();
      },

      PairingAnnotatedNote(a, b, c, d, e) {
        return a.reduce() + b.reduce() + c.reduce() + d.reduce() + e.reduce();
      },

      PairingMiddle(a, b, c) {
        return a.reduce() + b.reduce() + c.reduce();
      },

      InlineInfoFieldList(a) {
        return a.reduce();
      },

      InlineInfoField(a, b, c) {
        return a.reduce() + b.reduce() + c.reduce();
      },

      InlineInfoFieldX(a) {
        return a.reduce();
      },
      InlineInfoFieldX_unknown(_) {
        return '';
      },
      UnknownField(_1, _2) {
        return '';
      },
      UnknownFileHeaderField(_1, _2) {
        return '';
      },
      UnknownTuneHeaderField(_1, _2) {
        return '';
      },

      InBodyInfoFieldList(a, b, c) {
        return a.reduce() + b.reduce() + c.reduce();
      },
      InBodyInfoField(a) {
        return a.reduce();
      },
      InBodyInfoField_unknown(_) {
        return '';
      },


      /*
       * handle info fields
       {
       */
      reservedFileHeaderField(a) {
        return a.reduce();
      },
      reservedTuneHeaderField(a) {
        return a.reduce();
      },
      reservedInBodyField(a) {
        return a.reduce();
      },
      reservedInlineField (a) {
        return a.reduce();
      },
      reservedTuneHeaderFieldX(a, _, b) {
        return a.sourceString.concat(b.sourceString.trim());
      },
      reservedHeaderOnlyField(a, _, b) {
        return a.sourceString.concat(b.sourceString.trim());
      },
      reservedInBodyFieldX(a, _, b) {
        return a.sourceString.concat(b.sourceString.trim());
      },
      reservedInlineFieldX(a, _, b) {
        return a.sourceString.concat(b.sourceString.trim());
      },
      reservedCommonField(a) {
        return a.sourceString;
      },
      //} end of info fields
    });
    reducedText = semantics(mr).reduce();
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
        <div>
          <button class="h-8 ml-1 ring-2 text-base text-bold px-1 ring-[var(--app-color-500)]
            hover:bg-[var(--app-color-100)] active:bg-[var(--app-color-150)] active:scale-98" onclick={reduce}>reduce</button>
          <pre>{reducedText}</pre>
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
      <a class="text-gray-400" target="_blank" href="https://ohmjs.org/editor/" title="ohm syntax reference">https://ohmjs.org/editor/</a>
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
