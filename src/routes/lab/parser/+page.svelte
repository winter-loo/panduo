<script lang="ts">
  import * as ohm from 'ohm-js';

  const abcNotation = ohm.grammar(String.raw`
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
    Broken = note ">" note
    Rest =
    	("z" | "x") #(noteLength)?
        | ("Z" | "X") #(number)?
    Beam = #(note)+
    NoteSequence =
    	note+
        | Tie
        | Slur
        | BarNotes

    Bar = "||" | "|]" | "[|" | "|"
    Repeat = "::" | "|:" | ":|" | "[1" | "[2" | "|1" | ":|2"

    BarNotes = Bar NoteSequence*

    Tie = note #("-") Bar ? note
    Slur = "(" NoteSequence ")"
  }
`
  console.log(abcNotation);

  const mr = abcNotation.match(String.raw`
t:title

K:c
A,2 C/4 c3/4 | c"
`);
  console.log(mr);
  console.log('matched: ', mr.succeeded());
</script>
