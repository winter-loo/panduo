<script lang="ts">
import { onMount } from 'svelte';
  import * as ohm from 'ohm-js';
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Save as SaveIcon, Copy as CopyIcon } from '@lucide/svelte';

  let abcNotation = ohm.grammar(String.raw`
  AbcNotation {
      File = FileHeader (EmptyLines TuneBook)
      TuneBook = listOf<Tune, EmptyLines>
      Tune = TuneHeader TuneBody
      TuneHeader = InfoFields

      TuneBody =
      	Note+
      Note =
      	NotePitch NoteDuration? --regular
      	| "|" --bar
        | ">"
      NotePitch = NotePrefix? NoteName NotePostfix?
      NotePrefix = "^" | "_" | "^^" | "__" | "="
      NoteName =
          "A" | "B" | "C" | "D" | "E" | "F" | "G"
          | "a" | "b" | "c" | "d" | "e" | "f" | "g"
          | "z" | "Z" | "x" | "X"
      NotePostfix = "," | "'"

      NoteDuration =
          #(digit+ "/" digit+) --fra
          | #("/" digit+) --div
          | #("/"+)
          | #(digit+)


    FileHeader = InfoFields
    InfoFields = listOf<InfoField, EOL> EOL
    InfoField = Key ":" Value
    Key = letter
    Value = spaces listOf<Word, space> spaces
    Word = alnum+
    EmptyLines = EOL+
    EOL = "\r\n" | "\n" | "\r"
    space := " " | "\t"
  }
`);

`
  AbcNotation {
  	File = FileHeader? TuneBook
    FileHeader = InfoFields

    TuneBook =
    	EmptyLines listOf<Tune, EmptyLines> --tunebook
        | EOL* end --empty

    Tune = TuneHeader? TuneBody
    TuneBody =
    TuneHeader = InfoFields
    InfoFields = InfoField*
    InfoField = Key ":" Value (EOL | end)
    Key = letter
    Value = (~EOL any)*
    EmptyLines = EOL+
    EOL = "\r\n" | "\n" | "\r"
    space := " " | "\t" | end

  	Pitch = ("A".."G" | "a".."g")("," | "'")*
    Accidental = "^" | "_" | "^^" | "__" | "="
    NoteLength =
       	| #(number) "/" #(number) --frac
        | #(number) --mul
       	| "/" #(number) --div
    number = digit+
}
`;

`
  AbcNotation {
  	pitch = ("A".."G" | "a".."g")("," | "'")*
    accidental = "^"+ | "_"+ | "="
    noteLength =
       	| number "/" number --frac
        | number --mul
       	| "/" number --div
        | "/"+ --half
    number = digit+
    note = accidental? pitch noteLength?
    Broken = note ">" note NoteSequence?
    Rest =
    	("z" | "x") #(noteLength)?
        | ("Z" | "X") #(number)?
    Beam = #(note)+
    Regular = note+ NoteSequence?
    NoteSequence =
            | Broken
			| Regular
            | Tie
            | Slur
            | BarNotes
            | Rest

    Bar = "||" | "|]" | "[|" | "|"
    Repeat = "::" | "|:" | ":|" | "[1" | "[2" | "|1" | ":|2"

    BarNotes = Bar NoteSequence*

    Tie = NoteSequence? note #("-") Bar ? note NoteSequence?
    Slur = "(" NoteSequence+ ")"
    GraceNotes = "{"#( "/")? NoteSequence+ "}"
  }
`;

  let currentGrammar = $state('');
  let matchingText = $state('');
  let traceOutput = $state('');
  let failureMessage = $state('');

  onMount(() => {
    currentGrammar = String.raw`
      Abc {
          NoteSeq =
            | NoteSeq NoteSeq  --concat
            | "(" NoteSeq ")" --slur
            | "{" NoteSeq "}" --grace
            | "("#(digit) NoteSeq  --nplet
            | NoteConstruct BinaryNoteOp NoteConstruct --binary
            | NoteConstruct

          BinaryNoteOp =
            | BinaryNoteOp BinaryNoteOp  --multi
            | ">" --broken
            | "-" --tie

          NoteConstruct  = ChordAnnotation? AnnotationList? CoreNote

          ChordAnnotation = "\"" ChordAnnoText "\""
          ChordAnnoText = note
          ChordSymbol = "Am"

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

          CoreNote = #(accidental)? #(note) #(octave)? #(noteLen)?

          AnnotationList =
            | AnnotationList Annotation --list
            | Annotation --single
          Annotation =
            | "\"" AnnoText "\"" --anno
            | Decoration --deco
          AnnoText = (~EOL any)*

          Decoration =
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
              | "!mp!
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
          noteLen = digit

          InlineInfoFieldList = InlineInfoField*
          InlineInfoField = "["  Key ":" InlineFieldValue "]"
          InlineFieldValue     = (~(EOL | "]" | "[") any)*

          InBodyBlockInfoFieldList = EOL listOf<InfoField, EOL> EOL
          InfoField = Key ":" Value
          Key = letter
          Value = (~EOL any)*
          EmptyLines = EOL+
          EOL = "\r\n" | "\n" | "\r"
          note = "A".."G" | "a".."g"
          space := " " | "\t"
      }
      `;
      matchingText = "\nK:A\n";
  });

  $effect(() => {
    let abcNotation = ohm.grammar(currentGrammar);
    const mr = abcNotation.match(matchingText);
    if (mr.failed()) {
      failureMessage = mr.message!.replaceAll(" ", "&nbsp;").replaceAll("\n", "<br />");
    } else {
      failureMessage = '';
    }
    let to = abcNotation.trace(matchingText).toString();
    to = to.replaceAll(" ", "&nbsp;");
    to = to.replaceAll("\n", "<br />");
    traceOutput = to;
    });
</script>

<div class="flex justify-between w-screen max-h-screen">
  <div class="flex flex-col w-full max-h-full px-8 py-4">
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
       placeholder="ohm grammar: https://ohmjs.org/docs/syntax-reference"
       class="min-h-[200px]"
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
       placeholder="ohm grammar: https://ohmjs.org/docs/syntax-reference"
       class="min-h-[200px]"
        bind:value={matchingText}
      />
     </InputGroup.Root>
    </div>
  </div>
  <div class="flex flex-col max-h-full p-8">
    {#if failureMessage.length > 0}
      <p class="text-red-500 text-lg">{@html failureMessage}</p>
      <hr class="my-2 "/>
    {:else}
      <p class="max-h-fit overflow-scroll">{@html traceOutput}</p>
    {/if}
  </div>
</div>
