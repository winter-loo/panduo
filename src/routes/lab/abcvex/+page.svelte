<script lang="ts">
  import abcNotation from "../parser/abc.ohm?raw";
  import * as ohm from "ohm-js";
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
    Dot,
  } from "$lib/vexflow/vexflow-core";

  const abcGrammar = ohm.grammar(abcNotation);

  let abcInputText = $state("M:2/4\nL:1/4\nB3");

  let notes: StaveNote[] = [];
  class ParseContext {
    _unitNoteLength: number | null = null;
    // default: free meteer
    meter: Fraction = new Fraction(0, 1);

    constructor() {
      this.reset();
    }

    get unitNoteLength(): number {
      if (this._unitNoteLength != null) return this._unitNoteLength;
      let m = this.meter.value();
      if (m > 0 && m < 0.75) {
        return 16;
      } else {
        return 8;
      }
    }

    reset() {
      this._unitNoteLength = null;
      this.meter = new Fraction(0, 1);
    }
  }

  let pc = new ParseContext();
  let actions: ohm.ActionDict<any | undefined> = {
    // should not use _nonterminal
    // _nonterminal(...children) {
    //   children.map(c => c.toVex());
    // },
    _terminal() {
      return { type: "token", value: this.sourceString };
    },
    _iter(...children) {
      let r: { [index: string]: any } = { type: "iter" };
      children.map((c) => {
        r[c.ctorName] = c.toVex();
      });
      return r;
    },

    Tune_empty() {},

    Tune_onlyHeader(h) {
      h.toVex();
    },

    Tune_onlyBody(b) {
      b.toVex();
    },

    Tune_full(h, _, b) {
      h.toVex();
      b.toVex();
    },

    TuneHeader(field, _, fieldRest) {
      field.toVex();
      fieldRest.children.map((c) => c.toVex());
    },

    TuneHeaderField(f) {
      f.toVex();
    },

    TuneHeaderField_start(fs) {
      fs.toVex();
    },

    TuneHeaderField_end(fe) {
      fe.toVex();
    },

    // TuneHeaderField_unknown(f) {
    //   console.warn('unknown tune header field: ', f.sourceString);
    // },

    // keySignatureSetting(_kcolon, _spaces, tonic, maybeMode, maybeAlt) {
    //   const key = tonic.sourceString + (maybeMode.children.length ? ' ' + maybeMode.children[0].sourceString : '');
    //   return {key: tonic.sourceString.toLowerCase(), mode: maybeMode.children.length ? maybeMode.children[0].sourceString : null};
    // },

    UnitNoteLengthSetting(_Lcolon, _one, _slash, unitNoteLength) {
      pc._unitNoteLength = Number(unitNoteLength.sourceString);
    },

    // A simple meter mapping, expects "M:" spaces noteLen
    MeterSetting(_Mcolon, value) {
      let v = value.sourceString;
      let r = new Fraction(0, 1); // free meter
      if (v == "C") {
        r = new Fraction(4, 4);
      } else if (v == "C|") {
        r = new Fraction(2, 2);
      } else if (v == "none") {
        // use default value
      } else {
        r = value.toVex();
      }
      pc.meter = r;
    },

    fraction(num, _sp1, _slash, _sp2, den) {
      return new Fraction(Number(num.sourceString), Number(den.sourceString));
    },

    // tempoSetting(_Q, _sp, qv) {
    //   // qv returns numeric tempo in children
    //   return {tempo: qv.sourceString};
    // },

    TuneBody(l1, _e1, part, _e2, morePart, _e3, l2) {
      part.toVex();
      morePart.toVex();
    },

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

    NoteGroup(ca, bg) {
      bg.toVex();
    },

    // baseNoteGroup_chord(_open, annotatedNotes, _close, maybeLen) {
    //   // annotatedNotes = array of annotatedNote nodes
    //   const keys = annotatedNotes.children.map(n => n.toVex().key);
    //   const len = maybeLen.children.length ? maybeLen.children[0].toVex() : {duration: 'q'};
    //   const dur = len.duration;
    //   // VexFlow chord uses comma-separated keys in one StaveNote
    //   const staveNote = new StaveNote({ keys, duration: dur });
    //   return {type: 'tickable', vf: staveNote};
    // },

    baseNoteGroup(notes) {
      if (notes.children.length > 1) {
        // make a beam
      } else {
        notes.toVex();
      }
    },

    annotatedNote(maybeAnnotationOp, _i1, maybeSlurStart, _i2, baseNote) {
      baseNote.toVex();
    },

    baseNote(_acc, pitch, maybeLen) {
      const p = pitch.toVex();
      let duration = pc.unitNoteLength,
        dots = 0;
      if (maybeLen.children.length) {
        let dur = maybeLen.children[0].toVex();
        let frac = new Fraction(dur.num, dur.den);
        let dd = fractionToDottedDuration(frac, pc.unitNoteLength);
        if (dd) {
          duration = dd.base;
          dots = dd.dots;
        } else {
          throw new Error("Wrong note length notation: " + maybeLen.children[0].sourceString);
        }
      }
      const vfNote = new StaveNote({ keys: [p.value], duration: duration.toString(), autoStem: true });
      for (let i = 0; i < dots; i++) {
        Dot.buildAndAttach([vfNote]);
      }
      notes.push(vfNote);
      return { type: "baseNote", note: vfNote };
    },

    pitch(name, maybeOctave) {
      const step = name.sourceString.toLowerCase();
      let octave = (maybeOctave.children.length ? maybeOctave.children[0].toVex().octave : null) || 4;
      // is lower case letter
      if (name.sourceString == step) octave += 1;
      return { type: "pitch", value: step + "/" + octave };
    },

    octave(_) {
      const s = this.sourceString;
      // count quotes -> increase octave, commas decrease
      const quotes = (s.match(/'/g) || []).length;
      const commas = (s.match(/,/g) || []).length;
      // base octave 4
      return { type: "octave", octave: 4 + quotes - commas };
    },

    number(_) {
      return { type: "number", num: Number(this.sourceString) };
    },

    // noteLen returns an object with duration token for VexFlow
    noteLen_fra(num, _slash, den) {
      return { type: "noteLen", num: Number(num.sourceString), den: Number(den.sourceString) };
    },
    noteLen_div(_slash, den) {
      return { type: "noteLen", num: 1, den: Number(den.sourceString) };
    },
    noteLen_half(slashes) {
      return { type: "noteLen", num: 1, den: slashes.sourceString.length };
    },
    noteLen_mul(num) {
      return { type: "noteLen", num: Number(num.sourceString), den: 1 };
    },

    // fallback for unknowns
    UnknownField(_a1, _a2) {
      return null;
    },
  };
  const semantics = abcGrammar.createSemantics().addOperation("toVex", actions);

  // Example. The function converts a fraction representing a musical duration into a base duration and a number of dots.
  // The base duration is given as a denominator (e.g., 4 for a quarter note).
  // The input fraction `frac` is multiplied by the unit note length (1 / unl) to get the final duration.
  //
  // Examples with default unit note length (unl = 4, i.e., L:1/4)
  // frac = 2/1 ("C2") => total duration 2/4 = 1/2 => { base: 2, dots: 0 } (half note)
  // frac = 3/1 ("C3") => total duration 3/4 = 3/4 => { base: 2, dots: 1 } (dotted half note)
  // frac = 1/2 ("C/2") => total duration 1/8 = 1/8 => { base: 8, dots: 0 } (eighth note)
  // frac = 3/2 ("C3/2") => total duration 3/8 = 3/8 => { base: 4, dots: 1 } (dotted quarter note)
  //
  // Examples with unit note length = 8 (i.e., L:1/8)
  // frac = 1/1 ("C") with unl=8 => total duration 1/8 => { base: 8, dots: 0 }
  // frac = 7/2 ("C7/2") with unl=8 => total duration 7/16 => { base: 4, dots: 2 } (double-dotted quarter note)
  //
  // Invalid durations
  // frac = 5/2 ("C5/2") with unl=4 => total duration 5/8 => null (not representable with dots)
  function fractionToDottedDuration(frac: Fraction, unl: number = 4): { base: number; dots: number } | null {
    const totalDur = frac.clone().multiply(1, unl);
    totalDur.simplify();

    const num = totalDur.numerator;
    const den = totalDur.denominator;

    if (num <= 0 || den <= 0) {
      return null;
    }

    const numPlusOne = num + 1;
    // Check if numPlusOne is a power of 2. This means num is of the form 2^k - 1.
    // This covers both dotted (k>1) and non-dotted (k=1 => num=1) notes.
    if (numPlusOne > 0 && (numPlusOne & (numPlusOne - 1)) === 0) {
      const dots = Math.log2(numPlusOne) - 1;

      // Denominator of the dotted note duration is base * 2^dots
      const base = den / Math.pow(2, dots);

      // Base must be an integer and a power of 2.
      if (Number.isInteger(base) && base > 0 && (base & (base - 1)) === 0) {
        return { base, dots };
      }
    }

    return null;
  }

  $effect(() => {
    toVex();
  });

  let errMessage = $state("");
  let staffRef: any;
  function toVex() {
    notes = [];
    errMessage = "";
    pc.reset();
    if (staffRef) {
      staffRef.innerHTML = "";
    }
    let mr = abcGrammar.match(abcInputText, "Tune");

    try {
      semantics(mr).toVex();
    } catch (e) {
      if (e instanceof Error) errMessage = e.message;
      return;
    }

    let cfg = VexflowConfig.create({
      fontFamily: "Bravura",
    });
    let renderer = new VexFlow.Renderer("abcvex", VexFlow.Renderer.Backends.SVG, cfg);
    renderer.resize(800, 80);
    const stave = new Stave(0, 0, 200, { spaceAboveStaffLn: 2, spaceBelowStaffLn: 2 }, cfg);
    stave.addClef("treble");
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

{#if errMessage.length > 0}
  <hr />
  <pre class="text-red-500">{errMessage}</pre>
{/if}
