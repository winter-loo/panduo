<script lang="ts">
  import * as ohm from 'ohm-js';
  import { toAST } from 'ohm-js/extras';
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Save as SaveIcon, Copy as CopyIcon } from '@lucide/svelte';
  import abcNotation from './abc.ohm?raw';
  import test1 from './testdata/1.txt?raw';

  let currentGrammar = $state(abcNotation);
  let matchingText = $state('X:1\nK:D\n[CEG]->[CEG]');
  let traceOutput = $state('');
  let resultMessage = $state('');
  let ast = $state();

  matchingText = test1;

  $effect(() => {
    try {
      let abcNotation = ohm.grammar(currentGrammar);
      const mr = abcNotation.match(matchingText);
      if (mr.failed()) {
        resultMessage = mr.message!;
      } else {
        resultMessage = `matched, input text length ${matchingText.length}`;

        // traceOutput = abcNotation.trace(matchingText).toString();
        // ast = toAST(mr);
        // console.log('ast:', ast)
      }
    } catch (e) {
      if (e instanceof Error)
        resultMessage = 'Grammar Error: ' + e.message;
      else
        resultMessage = 'Unknown Grammar Error: ' + e;
    }
  });
</script>

<div class="flex flex-col w-screen h-screen">
  <div class="flex w-full h-3/4 px-1 py-4 gap-2">
    <InputGroup.Root class="w-1/2 flex flex-col">
      <InputGroup.Addon align="block-start" class="border-b">
        <InputGroup.Text>Grammar</InputGroup.Text>
        <InputGroup.Button class="ml-auto" size="icon-xs">
        <SaveIcon />
        </InputGroup.Button>
        <InputGroup.Button variant="ghost" size="icon-xs">
        <CopyIcon />
        </InputGroup.Button>
      </InputGroup.Addon>
      <InputGroup.Textarea
        placeholder="ohm syntax reference: https://ohmjs.org/docs/syntax-reference"
        bind:value={currentGrammar}
      />
    </InputGroup.Root>
    <InputGroup.Root class="w-1/2 flex flex-col">
      <InputGroup.Addon align="block-start" class="border-b">
        <InputGroup.Text>Input</InputGroup.Text>
        <InputGroup.Button class="ml-auto" size="icon-xs">
        <SaveIcon />
        </InputGroup.Button>
        <InputGroup.Button variant="ghost" size="icon-xs">
        <CopyIcon />
        </InputGroup.Button>
      </InputGroup.Addon>
      <InputGroup.Textarea
        placeholder="ohm syntax reference: https://ohmjs.org/docs/syntax-reference"
        bind:value={matchingText}
      />
    </InputGroup.Root>
  </div>
  <div class="flex flex-col h-1/4 p-8 border-t-4">
    {#if resultMessage.length > 0}
      <pre class="text-red-500 text-base text-wrap">{resultMessage}</pre>
    {:else}
      <!-- <pre class="max-h-fit overflow-auto">{ast}</pre> -->
      <pre class="max-h-fit overflow-auto">{traceOutput}</pre>
    {/if}
  </div>
</div>
