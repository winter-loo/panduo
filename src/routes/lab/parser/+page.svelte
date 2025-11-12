<script lang="ts">
import { onMount } from 'svelte';
  import * as ohm from 'ohm-js';
  import { toAST } from 'ohm-js/extras';
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Save as SaveIcon, Copy as CopyIcon } from '@lucide/svelte';

  let currentGrammar = $state('');
  let matchingText = $state('');
  let traceOutput = $state('');
  let failureMessage = $state('');
  let ast = $state();

  onMount(() => {
    currentGrammar = String.raw`
Abc {
  File = eol* (FileHeader eol eol+)? TuneBook

  FileHeader =
    | FileHeader eol FileHeader --many
    | reservedFileHeaderField
    | UnknownFileHeaderField --unknown

  TuneBook =
    | TuneBook eol eol+ TuneBook --many
    | Tune --one

  Tune = TuneHeader (eol TuneBody)? eol*
  TuneHeader = TuneHeaderStartField (eol TuneHeaderMiddleField)? eol TuneHeaderEndField
  TuneHeaderMiddleField =
    | TuneHeaderMiddleField eol TuneHeaderMiddleField --many
    | reservedTuneHeaderField
    | UnknownTuneHeaderField --unknown

  TuneBody = StaffElement

  StaffElement =
    | StaffElement StaffElement --concat
    | StaffElement eol InBodyInfoFieldList eol StaffElement --sepByBlockFields
    | InBodyInfoFieldList eol StaffElement --startWithBlockFields
    | InBodyInfoFieldList --trailingBlockFields
    | bar
    | rest
    | noteSeq
    | eol
    | lineContinue
    | InlineInfoFieldList --inlineFields

  rest =
      | ("z" | "x") noteLen? --inside
      | ("Z" | "X") number? --cross

  bar = ":|2" | "||" | "[|" | "|]" | "|:" | ":|" | "[1" | "[2" | "::" | "|1" | "|"

  noteSeq =
    | noteSeq noteSeq --beam
    | noteSeq space+ noteSeq --gap
    // spaces are not allowed between notes
    | noteSeq binaryOp noteSeq --binary
    | chordedNoteGroup --chorded

  noteGroup =
    | "(" spaces noteConstruct+ spaces ")" --slur
    | "{" spaces noteConstruct+ spaces "}" --grace
    | "[" spaces noteConstruct+ spaces "]" --chord
    | "(" digit noteConstruct+ --nplet
    | noteConstruct

  chordedNoteGroup = (chordAnnotation spaces)? annotatedNoteGroup
  annotatedNoteGroup = (annotationOp spaces)? noteGroup

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

  PairingAnnotatedNote =
    | chordAnnotation? "!trill(!" PairingMiddle "!trill)!" coreNote
    | chordAnnotation? "!crescendo(!" PairingMiddle "!crescendo)!" coreNote
    | chordAnnotation? "!<(!" PairingMiddle "!<)!" coreNote
    | chordAnnotation? "!diminuendo(!" PairingMiddle "!diminuendo)!" coreNote
    | chordAnnotation? "!>(!" PairingMiddle "!>)!" coreNote
  PairingMiddle = coreNote noteSeq* chordAnnotation?

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
  InlineInfoField = "[" InlineInfoFieldX "]"
  InlineInfoFieldX =
    | reservedInlineField
    | UnknownField --unknown
  InlineFieldValue = (~(eol | "]" | "[") any)*
  InBodyInfoFieldList =
    | InBodyInfoFieldList eol InBodyInfoFieldList --many
    | reservedInBodyField --one
    | UnknownField --unkown

  TuneHeaderStartField = "X:" number
  TuneHeaderEndField   = "K:" oneLineValue

  reservedFileHeaderField = reservedHeaderOnlyField

  reservedTuneHeaderField =
    | reservedTuneHeaderFieldX
    | reservedHeaderOnlyField
    | reservedCommonField

  reservedTuneHeaderFieldX =
    | "P:" spaces oneLineValue
    | "Q:" spaces qKeyedValue
    | "T:" spaces oneLineValue
    | "V:" spaces oneLineValue
    | "W:" spaces oneLineValue

  reservedInBodyField =
    | reservedInBodyFieldX
    | reservedCommonField

  reservedInBodyFieldX =
  	| "K:" spaces oneLineValue
    | "P:" spaces oneLineValue
    | "Q:" spaces qKeyedValue
    | "s:" spaces oneLineValue
    | "T:" spaces oneLineValue
    | "V:" spaces oneLineValue
    | "W:" spaces oneLineValue
    | "w:" spaces oneLineValue

  reservedInlineField =
    | reservedInlineFieldX
    | reservedCommonField

  reservedInlineFieldX =
   	| "K:" spaces oneLineValue
    | "P:" spaces oneLineValue
    | "Q:" spaces qKeyedValue
    | "R:" spaces oneLineValue
    | "V:" spaces oneLineValue

  reservedHeaderOnlyField =
    | "A:" spaces oneLineValue
    | "B:" spaces oneLineValue
    | "C:" spaces oneLineValue
    | "D:" spaces oneLineValue
    | "F:" spaces oneLineValue
    | "G:" spaces oneLineValue
    | "H:" spaces oneLineValue
    | "S:" spaces oneLineValue
    | "Z:" spaces manyLineValue
    | "O:" spaces oneLineValue

  reservedCommonField =
    | "I:" spaces oneLineValue
    | "L:" spaces noteLen
    | "M:" spaces noteLen
    | "m:" spaces oneLineValue
    | "N:" spaces oneLineValue
    | "R:" spaces oneLineValue
    | "r:" spaces oneLineValue
    | "U:" spaces oneLineValue
    | fieldContinue spaces oneLineValue

  qKeyedValue = dqTextString? spaces  (number "/" number "=")? number spaces dqTextString?

  UnknownFileHeaderField = ~(reservedFileHeaderField) key oneLineValue
  UnknownTuneHeaderField = ~(reservedTuneHeaderField | TuneHeaderStartField | TuneHeaderEndField) key oneLineValue
  UnknownField = ~(reservedInBodyField | reservedInlineField | reservedTuneHeaderField | reservedFileHeaderField) key oneLineValue

  key = letter ":"
  textString  = (~(eol | "\"") any)*
  dqTextString = "\"" textString "\""
  // allow newline in value but line beginning with letter + colon
  // is a marker for info field
  oneLineValue  = (~(eol) any)*
  manyLineValue = (~(eol key) any)*
  comment = "%" (~eol any)*
  commentLine = eol comment
  eol = "\r\n" | "\n" | "\r"
  space := " " | "\t" | comment | commentLine
  number = digit+
  lineContinue = "\\"
  fieldContinue = "+:"
}
`;

      matchingText = `[CEG]->[CEG]`;
  });

  $effect(() => {
    try {
      let abcNotation = ohm.grammar(currentGrammar);
      const mr = abcNotation.match(matchingText, 'noteSeq');
      if (mr.failed()) {
        failureMessage = mr.message!;
      } else {
        failureMessage = '';

        traceOutput = abcNotation.trace(matchingText, 'noteSeq').toString();
        // ast = toAST(mr);
        // console.log('ast:', ast)
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
      <pre class="text-red-500 text-base text-wrap">{failureMessage}</pre>
      <hr class="my-2 "/>
    {:else}
      <!-- <pre class="max-h-fit overflow-auto">{ast}</pre> -->
      <pre class="max-h-fit overflow-auto">{traceOutput}</pre>
    {/if}
  </div>
</div>
