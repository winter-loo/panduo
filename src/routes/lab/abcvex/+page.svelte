<script lang="ts">
  import * as VF from '$lib/vexflow/vexflow-core';
  import abcNotation from '../parser/abc.ohm?raw';
  import * as ohm from 'ohm-js';

  const abcGrammar = ohm.grammar(abcNotation);

  let abcInputText = $state(String.raw`
L:1/4
M:3/4
Q:"Allegretto" 3/4=66
%%score {R | L}
V:R treble
V:L bass m=D
K:G
[V:R] (!5!d G/A/B/c/ | .d) .G .G | (!3!e c/d/e/f/ | .g) .G .G |
[V:L] [GBd]2 A | B3 | c3 | B3 |
`);

  const semantics = abcGrammar.createSemantics().addOperation('toVex', {
    _nonterminal(...children) {
      return children.map(c => c.toVex()).join('');
    },
    _terminal() {
      return this.sourceString;
    },
    _iter(...children) {
      return children.map(c => c.toVex()).join('');
    },

    Tune(tuneHeader, maybeBody) {
    },

    keySignatureSetting(_kcolon, _spaces, tonic, maybeMode, maybeAlt) {
      const key = tonic.sourceString + (maybeMode.children.length ? ' ' + maybeMode.children[0].sourceString : '');
      return {key: tonic.sourceString.toLowerCase(), mode: maybeMode.children.length ? maybeMode.children[0].sourceString : null};
    },

    unitNoteLengthSetting(_Lcolon, _spaces, noteLen) {
      return {unitNoteLength: noteLen.toVex()};
    },

    // A simple meter mapping, expects "M:" spaces noteLen
    meterSetting(_Mcolon, _spaces, noteLen) {
      // noteLen: returns {num, den} or null
      const nl = noteLen.toVex ? noteLen.toVex() : null;
      if (nl && nl.num && nl.den) {
        return {meter: {num_beats: nl.num, beat_value: nl.den}};
      }
      return {meter: {num_beats: 4, beat_value: 4}};
    },

    tempoSetting(_Q, _sp, qv) {
      // qv returns numeric tempo in children
      return {tempo: qv.sourceString};
    },

    TuneBody(...children) {
    },

    MusicCode(...children) {
    },

  // MusicCodePart alternatives
  MusicCodePart_noteseq(seq) { return seq.toVex(); },
  MusicCodePart_rest(r) { return r.toVex(); },
  MusicCodePart_bar(bar) { return {type: 'bar', text: bar.sourceString}; },
  MusicCodePart_slurStart(_) { return null; },
  MusicCodePart_slurEnd(_) { return null; },

  // Rest mapping
  rest_inside(_letter, maybeLen) {
    // const len = maybeLen.children.length ? maybeLen.children[0].toVex() : null;
    // const duration = len ? len.duration : 'q';
    // return {type: 'tickable', vf: new VF.StaveNote({ keys: ['b/4'], duration: duration + 'r' })};
  },
  rest_cross(_letter, _maybeNum) {
    // const duration = 'w'; // treat Z/X uppercase as whole rest by heuristic
    // return {type: 'tickable', vf: new VF.StaveNote({ keys: ['b/4'], duration: duration + 'r' })};
  },

  // Note sequences
  NoteSeq_binary(left, ops, right) {
    // For binary constructs (like pitch1 tie pitch2) map each note.
    const l = left.toVex();
    const r = right.toVex();
    // tie handling
    if (ops.children && ops.children.some(c => c.sourceString === '-')) {
      // create tie between last head of l and r
      // We'll return both notes; actual tie needs Vex.Flow.StaveTie — omitted for brevity
    }
    return [].concat(l, r);
  },

  NoteGroup_group(x) { return x.toVex(); },
  NoteGroup(x) { return x.toVex(); },

  baseNoteGroup_chord(_open, annotatedNotes, _close, maybeLen) {
    // annotatedNotes = array of annotatedNote nodes
    const keys = annotatedNotes.children.map(n => n.toVex().key);
    const len = maybeLen.children.length ? maybeLen.children[0].toVex() : {duration: 'q'};
    const dur = len.duration;
    // VexFlow chord uses comma-separated keys in one StaveNote
    const staveNote = new VF.StaveNote({ keys, duration: dur });
    return {type: 'tickable', vf: staveNote};
  },

  annotatedNote(maybeAnnotationOp, maybeParens, baseNote) {
    const bn = baseNote.toVex();
    // annotationOp could set articulations; ignore for now
    return bn;
  },

  baseNote(acc, pitch, maybeLen) {
    const p = pitch.toVex();
    const len = maybeLen.children.length ? maybeLen.children[0].toVex() : {duration: 'q'};
    const duration = len.duration;
    const key = p.step + '/' + (p.octave || 4);
    const vfNote = new VF.StaveNote({ keys: [key], duration });
    return {type: 'tickable', vf: vfNote, key};
  },

  pitch(name, maybeOctave) {
    const step = name.sourceString.toLowerCase();
    const octave = (maybeOctave.children.length ? maybeOctave.children[0].toVex().octave : null) || 4;
    return {step, octave};
  },

  octave() {
    const s = this.sourceString;
    // count quotes -> increase octave, commas decrease
    const quotes = (s.match(/'/g)||[]).length;
    const commas = (s.match(/,/g)||[]).length;
    // base octave 4
    return {octave: 4 + quotes - commas};
  },

  accidental() {
    // Just return string (e.g., "^^" or "b")
    return this.sourceString;
  },

  number(ds) { return {num: Number(this.sourceString)}; },

  // noteLen returns an object with duration token for VexFlow
  noteLen_fra(num, _slash, den) {
    // return {num: Number(num.sourceString), den: Number(den.sourceString), duration: durationFromFraction(Number(num.sourceString), Number(den.sourceString))};
  },
  noteLen_div(_slash, num) {},
  noteLen_half(slashes) {},
  noteLen_mul(num) {},

  // fallback for unknowns
  UnknownField() { return null; },
});

  $effect(() => {
  let mr = abcGrammar.match(abcInputText);
    semantics(mr).toVex();
  });
</script>
<textarea id="abcInput" bind:value={abcInputText}></textarea>
<div id="abcvex"></div>
