<script lang="ts">
  import abcNotation from '../parser/abc.ohm?raw';
  import * as ohm from 'ohm-js';
  import {
    RenderContext,
    Renderer,
    Stave,
    StaveConnector,
    StaveNote,
    VexFlow,
    VexflowConfig,
    Font,
    VexflowConfigInstance,
    type StaveNoteStruct,
    Fraction,
  } from '$lib/vexflow/vexflow-core';

  const abcGrammar = ohm.grammar(abcNotation);

  let abcInputText = $state('B3');

  let notes: StaveNote[] = [];
  const semantics = abcGrammar.createSemantics().addOperation('toVex', {
    // should not use _nonterminal
    // _nonterminal(...children) {
    //   children.map(c => c.toVex());
    // },
    _terminal() {
      return {type: 'token', value: this.sourceString};
    },
    _iter(...children) {
      let r: {[index: string]: any} = {type: 'iter'};
      children.map(c => {
        r[c.ctorName] = c.toVex();
      });
      return r;
    },

    // Tune(tuneHeader, maybeBody) {
    // },
    //
    // keySignatureSetting(_kcolon, _spaces, tonic, maybeMode, maybeAlt) {
    //   const key = tonic.sourceString + (maybeMode.children.length ? ' ' + maybeMode.children[0].sourceString : '');
    //   return {key: tonic.sourceString.toLowerCase(), mode: maybeMode.children.length ? maybeMode.children[0].sourceString : null};
    // },
    //
    // unitNoteLengthSetting(_Lcolon, _spaces, noteLen) {
    //   return {unitNoteLength: noteLen.toVex()};
    // },
    //
    // // A simple meter mapping, expects "M:" spaces noteLen
    // meterSetting(_Mcolon, _spaces, noteLen) {
    //   // noteLen: returns {num, den} or null
    //   const nl = noteLen.toVex ? noteLen.toVex() : null;
    //   if (nl && nl.num && nl.den) {
    //     return {meter: {num_beats: nl.num, beat_value: nl.den}};
    //   }
    //   return {meter: {num_beats: 4, beat_value: 4}};
    // },
    //
    // tempoSetting(_Q, _sp, qv) {
    //   // qv returns numeric tempo in children
    //   return {tempo: qv.sourceString};
    // },
    //
    // TuneBody(...children) {
    // },
    //
    // MusicCode(...children) {
    // },

  // MusicCodePart alternatives
  // MusicCodePart_noteseq(seq) { return seq.toVex(); },
  // MusicCodePart_rest(r) { return r.toVex(); },
  // MusicCodePart_bar(bar) { return {type: 'bar', text: bar.sourceString}; },
  // MusicCodePart_slurStart(_) { return null; },
  // MusicCodePart_slurEnd(_) { return null; },

  // Rest mapping
  // rest_inside(_letter, maybeLen) {
    // const len = maybeLen.children.length ? maybeLen.children[0].toVex() : null;
    // const duration = len ? len.duration : 'q';
    // return {type: 'tickable', vf: new VF.StaveNote({ keys: ['b/4'], duration: duration + 'r' })};
  // },
  // rest_cross(_letter, _maybeNum) {
    // const duration = 'w'; // treat Z/X uppercase as whole rest by heuristic
    // return {type: 'tickable', vf: new VF.StaveNote({ keys: ['b/4'], duration: duration + 'r' })};
  // },

  // Note sequences
  // NoteSeq_binary(left, ops, right) {
  //   // For binary constructs (like pitch1 tie pitch2) map each note.
  //   const l = left.toVex();
  //   const r = right.toVex();
  //   // tie handling
  //   if (ops.children && ops.children.some(c => c.sourceString === '-')) {
  //     // create tie between last head of l and r
  //     // We'll return both notes; actual tie needs Vex.Flow.StaveTie — omitted for brevity
  //   }
  //   return [].concat(l, r);
  // },

  // NoteGroup_group(x) { return x.toVex(); },
  // NoteGroup(x) { return x.toVex(); },

  // baseNoteGroup_chord(_open, annotatedNotes, _close, maybeLen) {
  //   // annotatedNotes = array of annotatedNote nodes
  //   const keys = annotatedNotes.children.map(n => n.toVex().key);
  //   const len = maybeLen.children.length ? maybeLen.children[0].toVex() : {duration: 'q'};
  //   const dur = len.duration;
  //   // VexFlow chord uses comma-separated keys in one StaveNote
  //   const staveNote = new StaveNote({ keys, duration: dur });
  //   return {type: 'tickable', vf: staveNote};
  // },

  // baseNoteGroup(notes) {
  //   if (notes.children.length > 1) {
  //       // make a beam
  //   } else {
  //     return notes.toVex();
  //   }
  // },

  // annotatedNote(maybeAnnotationOp, maybeParens, baseNote) {
  //   const bn = baseNote.toVex();
  //   // annotationOp could set articulations; ignore for now
  //   return bn;
  // },

  baseNote(_acc, pitch, maybeLen) {
    const p = pitch.toVex();
    let durationOverride = new Fraction(1, 4);
    if (maybeLen.children.length) {
      let dur = maybeLen.children[0].toVex();
      console.log('xxx note duration', dur);
      durationOverride = new Fraction(dur.num, dur.den);
    }
    const vfNote = new StaveNote({ keys: [p.value], duration: 'q', durationOverride });
    console.log('xxx note pitch', p.value);
    notes.push(vfNote);
    return {type: 'baseNote', note: vfNote};
  },

  pitch(name, maybeOctave) {
    const step = name.sourceString.toLowerCase();
    let octave = (maybeOctave.children.length ? maybeOctave.children[0].toVex().octave : null) || 4;
    // is lower case letter
    if (name.sourceString == step) octave += 1;
    return {type: 'pitch', value: step + '/' + octave};
  },

  octave(_) {
    const s = this.sourceString;
    // count quotes -> increase octave, commas decrease
    const quotes = (s.match(/'/g)||[]).length;
    const commas = (s.match(/,/g)||[]).length;
    // base octave 4
    return {type: 'octave', octave: 4 + quotes - commas};
  },

  number(_) { return {type: 'number', num: Number(this.sourceString)}; },

  // noteLen returns an object with duration token for VexFlow
  noteLen_fra(num, _slash, den) {
    return {type: 'noteLen', num: Number(num.sourceString), den: Number(den.sourceString)};
  },
  noteLen_div(_slash, den) {
    return {type: 'noteLen', num: 1, den: Number(den.sourceString)};
  },
  noteLen_half(slashes) {
    return {type: 'noteLen', num: 1, den: slashes.sourceString.length};
  },
  noteLen_mul(num) {
    return {type: 'noteLen', num: Number(num.sourceString), den: 1};
  },

    // fallback for unknowns
    UnknownField(_a1, _a2) { return null; },
  });

  $effect(() => {
    toVex();
  });

  let staffRef;
  function toVex() {
    notes = [];
    if (staffRef) {
      staffRef.innerHTML = '';
    }
    let mr = abcGrammar.match(abcInputText, 'baseNote');
    semantics(mr).toVex();

    let cfg = VexflowConfig.create({
      fontFamily: 'Bravura',
    });
    let renderer = new VexFlow.Renderer("abcvex", VexFlow.Renderer.Backends.SVG, cfg);
    renderer.resize(800, 80);
    const stave = new Stave(0, 0, 200, { spaceAboveStaffLn: 2, spaceBelowStaffLn: 2 }, cfg);
    stave.addClef('treble');
    stave.setContext(renderer.getContext()).draw();
    VexFlow.Formatter.FormatAndDraw(
      renderer.getContext(),
      stave,
      { notes },
      {
        params: {
          autoBeam: true,
        },
      },
    );
  }
</script>
<div>
  <textarea id="abcInput" class="w-screen p-4 min-h-[200px]" bind:value={abcInputText}></textarea>
  <button onclick={toVex}>toVex</button>
</div>
<div id="abcvex" bind:this={staffRef} class="ml-10"></div>
