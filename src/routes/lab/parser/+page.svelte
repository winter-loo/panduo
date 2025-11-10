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

`
Abc {
    NoteSeq =
    	NoteSeq NoteSeq  --concat
        |  note ">" note --broken
        |  note #("-") note --tie
        |  "(" NoteSeq ")" --slur
        | "{" NoteSeq "}" --grace
        | "("#(digit) NoteSeq  --nplet
    	| note

    note = "A".."G" | "a".."g"
  }
`;

`
Abc  {
    NoteSeq =
    	NoteSeq NoteSeq  --concat
        |  note ">" note --broken
        |  note #("-") note --tie
        |  "(" NoteSeq ")" --slur
        | "{" NoteSeq "}" --grace
        | "("#(digit) NoteSeq  --nplet
        | "[" #(NoteConstruct)+ "]" --chord
        | NoteConstruct


    NoteConstruct  = ChordAnnotation? AnnotationList? CoreNote

    ChordAnnotation = "\"" ChordAnnoText "\""
    ChordAnnoText = note
    ChordSymbol = "Am"

    PairingAnnotationNote = CoreNoteWithStartAnnotation NoteSeq* CoreNoteWithEndAnnotation

    CoreNoteWithStartAnnotation = ("\"" ChordSymbol "\"")? AnnotationStart CoreNote
    CoreNoteWithEndAnnotation = ("\"" ChordSymbol "\"")? AnnotationEnd CoreNote

    CoreNote = #(accidental)? #(note) #(octave)? #(noteLen)?

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
  }
`;


  `
Abc  {
    NoteSeq =
    	NoteSeq NoteSeq  --concat
        |  NoteConstruct BinaryNoteOp NoteConstruct --binary
        |  "(" NoteSeq ")" --slur
        |  "{" NoteSeq "}" --grace
        | UnaryOp NoteSeq  --nplet
    	| NoteConstruct

       UnaryOp = "(" #(digit)
       BinaryNoteOp = BinaryNoteOp BinaryNoteOp  --multi
       		| ">"
            | "-"


     NoteConstruct  = ("\"" ChordSymbol "\"")? AnnotationList?  CoreNote

     CoreNote = #(accidental)? #(note) #(octave)? #(noteLen)? --single
     		| "[" NoteConstruct+ "]" --chord


     ChordSymbol = "Am"
     AnnotationList =
     	| AnnotationList Annotation --list
     	| Annotation --single
     Annotation =
     	"\""  AnnoText "\"" --anno
     	| "!0!" --deco
        | "!f!"

     AnnoText =
     	| "^I"
    accidental = "^"+ | "_"+ | "="
    note = "A".."G" | "a".."g"
    octave = ","+ | "'"+
    noteLen = digit
  }
`;

`
Abc {
  NoteSeq =
    | NoteConstruct BinaryNoteOp NoteConstruct --binary
    | NoteConstruct

  BinaryNoteOp =
    | BinaryNoteOp BinaryNoteOp  --multi
    | ">"
    | "-"


  NoteConstruct = CoreNote

  CoreNote = note

  note = "A".."G" | "a".."g"
}
`;


`
Abc {
    InlineInfoFieldList = InlineInfoField*
    InlineInfoField = "["  Key ":" InlineFieldValue "]"
    Key       = letter
    InlineFieldValue     = (~(EOL | "]" | "[") any)*
    EOL = "\r\n" | "\n" | "\r"
    space := " " | "\t" | end
}
`;


  `
Abc {
	BlockInfoField = InfoField EOL

    InfoField = Key ":" Value
    Key = letter
    Value = (~EOL any)*
    EmptyLines = EOL+
    EOL = "\r\n" | "\n" | "\r"
    space := " " | "\t" | end
}

`;
  console.log(abcNotation);

  const mr = abcNotation.match(String.raw`
t:title

K:c
A,2 C/4 c3/4 | c"
`);
  console.log(mr);
  console.log('matched: ', mr.succeeded());
</script>
