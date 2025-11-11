<script lang="ts">
import { onMount } from 'svelte';
  import * as ohm from 'ohm-js';
  import { toAST } from 'ohm-js/extras';
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Save as SaveIcon, Copy as CopyIcon } from '@lucide/svelte';


`
Abc {
		Foo = annotationList

    annotationList =
      | annotationList space+ annotation --inde
      | annotationList annotation --beam
      | annotation --single

		annotation = "\"" annoText "\""
    annoText = (~(eol | "\"") any)*
		eol = "\n" | "\r\n" | "\r"
		space := " " | "\t"
}
`;

  let currentGrammar = $state('');
  let matchingText = $state('');
  let traceOutput = $state('');
  let failureMessage = $state('');
  let ast = $state();

  onMount(() => {
    currentGrammar = String.raw`
      Abc {
          File = FileHeader? TuneBook
          FileHeader = BlockInfoFieldList (EOL EOL+ | end)

          TuneBook = listOf<Tune, EOL+> EOL*

          Tune = TuneHeader? TuneBody
          TuneHeader = BlockInfoFieldList (EOL | end)
          TuneBody = StaffElement

          StaffElement =
            | StaffElement StaffElement --concat
            | bar spaces noteseq
            | rest
            | noteSeq

          rest =
              | ("z" | "x") noteLen? --inside
              | ("Z" | "X") number? --cross

          bar = "||" | "|" | "[|" | "|]" | "|:" | ":|" | "[1" | "[2" | "::" | "|1" | ":|2"

          noteSeq =
            | chordAnnotation spaces noteGroup --group
            | noteGroup
            | noteConstruct

          noteGroup =
            | noteSeq noteSeq --beam
            | noteSeq space+ noteSeq --gap
            | "(" spaces noteSeq spaces ")" --slur
            | "{" spaces noteSeq spaces "}" --grace
            | "(" digit noteConstruct+ --nplet
            // spaces are not allowed between notes
            | noteConstruct binaryOp noteConstruct --binary


          binaryOp =
            | binaryOp binaryOp  --many
            // the use of broken rhythm markers between notes of unequal lengths
            // will produce undefined results, and should be avoided.
            | ">"+ --brokenDottedFirst
            | "<"+ --brokenDottedSecond
            | "-" --tie

          noteConstruct = (chordAnnotation spaces)? annotatedNote

          annotatedNote = (annotationOp spaces)? coreNote
          annotationOp =
            | annotationOp annotationOp --concat
            | annotationOp space+ annotationOp --gap
            | annotation

          chordAnnotation = "\"" chordAnnoText "\""
          // <note><accidental><type></bass>
          chordAnnoText = "A".."G" #(chordAnnoSharp)? #(chordAnnoType)? #("/" ("A".."G" | "a".."g"))?
          chordAnnoSharp = "b" | "#" | "\u266d" | "\u266e" | "\u266f"
          chordAnnoType =
            | chordAnnoType chordAnnoType --many
            | "m" | "min" | "maj" | "dim" | "aug" | "+" | "sus" | number

          PairingAnnotationNote = CoreNoteWithStartAnnotation NoteSeq* CoreNoteWithEndAnnotation
          CoreNoteWithStartAnnotation = ChordAnnotation? AnnotationStart CoreNote
          CoreNoteWithEndAnnotation = ChordAnnotation? AnnotationEnd CoreNote
          AnnotationStart =
            | "!trill(!"
            | "!crescendo(!"
            | "!<(!"
            | "!diminuendo(!"
            | "!>(!"
          AnnotationEnd =
            | "!trill)!"
            | "!crescendo)!"
            | "!<)!"
            | "!diminuendo)!"
            | "!>)!"

          coreNote = accidental? note octave? noteLen?

          annotation =
            | "\"" annoText "\"" --anno
            | decoration --deco
          annoText = (~(eol | "\"") any)*

          decoration =
              | "."
              | "~"
              | "H"
              | "L"
              | "M"
              | "O"
              | "P"
              | "S"
              | "T"
              | "u"
              | "v"
              | "!trill!"
              | "!lowermordent!"
              | "!uppermordent!"
              | "!mordent!"
              | "!pralltriller!"
              | "!roll!"
              | "!turn!"
              | "!turnx!"
              | "!invertedturn!"
              | "!invertedturnx!"
              | "!arpeggio!"
              | "!>!"
              | "!accent!"
              | "!emphasis!"
              | "!fermata!"
              | "!invertedfermata!"
              | "!tenuto!"
              | "!0!"
              | "!1!"
              | "!2!"
              | "!3!"
              | "!4!"
              | "!5!"
              | "!+!"
              | "!plus!"
              | "!snap!"
              | "!slide!"
              | "!wedge!"
              | "!upbow!"
              | "!downbow!"
              | "!open!"
              | "!thumb!"
              | "!breath!"
              | "!pppp!"
              | "!ppp!"
              | "!pp!"
              | "!p!"
              | "!mp!"
              | "!mf!"
              | "!f!"
              | "!ff!"
              | "!fff!"
              | "!ffff!"
              | "!sfz!"
              | "!segno!"
              | "!coda!"
              | "!D.S.!"
              | "!D.C.!"
              | "!dacoda!"
              | "!dacapo!"
              | "!fine!"
              | "!shortphrase!"
              | "!mediumphrase!"
              | "!longphrase!"

          accidental = "^"+ | "_"+ | "="
          note = "A".."G" | "a".."g"
          octave = ","+ | "'"+
          noteLen =
            | number "/" number --fra
            | "/" number        --div
            | "/"+              --half
            | number            --mul

          InlineInfoFieldList = InlineInfoField*
          InlineInfoField = "["  Key ":" InlineFieldValue "]"
          InlineFieldValue     = (~(EOL | "]" | "[") any)*

          BlockInfoFieldList = listOf<InfoField, EOL>
          InBodyBlockInfoFieldList = EOL listOf<InfoField, EOL> EOL
          InfoField = Key ":" Value
          Key = letter
          Value = (~EOL any)*
          EOL = "\r\n" | "\n" | "\r"
          space := " " | "\t"
          number = digit+
      }
      `;
      matchingText = "\nK:A\n";
  });

  $effect(() => {
    try {
      let abcNotation = ohm.grammar(currentGrammar);
      const mr = abcNotation.match(matchingText);
      if (mr.failed()) {
        failureMessage = mr.message!;
      } else {
        failureMessage = '';

        traceOutput = abcNotation.trace(matchingText).toString();
        ast = toAST(mr).toString();
      }
    } catch (e) {
      if (e instanceof Error)
        failureMessage = 'Grammar Error: ' + e.message;
      else
        failureMessage = 'Unknown Grammar Error: ' + e;
    }
  });
</script>

<div class="flex justify-start w-screen max-h-screen">
  <div class="flex flex-col w-full lg:w-2/3 lg:max-w-[1200px] border-box max-h-full px-1 py-4 gap-2">
    <div class="w-full h-2/3 max-h-2/3">
     <InputGroup.Root class="h-full max-h-full overflow-hidden">
      <InputGroup.Addon align="block-start" class="border-b">
       <InputGroup.Button class="ml-auto" size="icon-xs">
        <SaveIcon />
       </InputGroup.Button>
       <InputGroup.Button variant="ghost" size="icon-xs">
        <CopyIcon />
       </InputGroup.Button>
      </InputGroup.Addon>
      <InputGroup.Textarea
        placeholder="ohm syntax reference: https://ohmjs.org/docs/syntax-reference"
        class="min-h-[200px] h-full overflow-auto"
        bind:value={currentGrammar}
      />
     </InputGroup.Root>
    </div>
    <div class="grid w-full gap-4">
     <InputGroup.Root>
      <InputGroup.Addon align="block-start" class="border-b">
       <InputGroup.Button class="ml-auto" size="icon-xs">
        <SaveIcon />
       </InputGroup.Button>
       <InputGroup.Button variant="ghost" size="icon-xs">
        <CopyIcon />
       </InputGroup.Button>
      </InputGroup.Addon>
      <InputGroup.Textarea
       placeholder="ohm syntax reference: https://ohmjs.org/docs/syntax-reference"
       class="min-h-[200px]"
        bind:value={matchingText}
      />
     </InputGroup.Root>
    </div>
  </div>
  <div class="flex flex-col max-h-full p-8">
    {#if failureMessage.length > 0}
      <pre class="text-red-500 text-base">{failureMessage}</pre>
      <hr class="my-2 "/>
    {:else}
      <pre class="max-h-fit overflow-auto">{ast}</pre>
      <pre class="max-h-fit overflow-auto">{traceOutput}</pre>
    {/if}
  </div>
</div>
