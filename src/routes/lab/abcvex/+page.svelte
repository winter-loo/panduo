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
    // VexflowConfig,
    Font,
    // VexflowConfigInstance,
    type StaveNoteStruct,
    Fraction,
    Dot,
    Beam,
    Note,
    StemmableNote,
    Formatter,
    StaveTie,
    Curve,
    Voice,
    // } from "$lib/vexflow/vexflow-core";
  } from "vexflow";

  const abcGrammar = ohm.grammar(abcNotation);

  let abcInputText = $state("M:3/4\nL:1/8\n(Cfg) (fd>g) | CD EF GD | C D E F G A");

  class ParseContext {
    _unitNoteLength: number | null = null;
    // default: free meteer
    meter: Fraction = new Fraction(0, 1);
    notes: StemmableNote[] = [];
    beams: [number, number][] = [];
    ties: {
      from?: number | null;
      to?: number | null;
      firstIndexes?: number[];
      lastIndexes?: number[];
    }[] = [];
    slurs: [number | undefined, number | undefined][] = [];
    staves: Stave[] = [];
    staveX: number = 0;
    voices: [number, number][] = [[0, Infinity]];

    constructor() {
      this.reset();
    }

    NewStave(): Stave {
      const staveWidth = 400;
      const stave = new Stave(this.staveX, 0, staveWidth, { spaceAboveStaffLn: 8, spaceBelowStaffLn: 8 });
      this.staves.push(stave);
      this.staveX += staveWidth;
      return stave;
    }

    CurrentStave(): Stave {
      if (this.staves.length == 0) {
        throw new Error("you must create a stave first")!;
      }
      return this.staves[this.staves.length - 1];
    }

    NewVoice() {
      this.voices.push([this.notes.length, Infinity]);
    }

    CurrentVoice(): [number, number] {
      return this.voices[this.voices.length - 1];
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
      this.notes = [];
      this.beams = [];
      this.ties = [];
      this.slurs = [];
      this.staves = [];
      this.staveX = 0;
      this.voices = [[0, Infinity]];
    }

    NewNote(keys: string[], notelen: Fraction): StaveNote {
      let dd = fractionToDottedDuration(notelen, this.unitNoteLength);
      if (!dd) {
        throw new Error("Wrong note length notation: " + notelen);
      }
      let duration = dd.base.toString();
      let dots = dd.dots;
      let nnote = new StaveNote({ keys, duration, autoStem: true });
      for (let i = 0; i < dots; i++) {
        Dot.buildAndAttach([nnote]);
      }
      nnote.setStave(this.CurrentStave());
      return nnote;
    }

    createBeam(start: number, end: number) {
      let beamables: [number, number][] = [];
      let beamable: [number, number] = [-1, -1];
      for (let i = start; i <= end; i++) {
        let n = this.notes[i];
        if (n.getIntrinsicTicks() < VexFlow.durationToTicks("4")) {
          if (beamable[0] < 0) beamable[0] = i;
          else beamable[1] = i;
        } else {
          if (beamable[1] > 0) {
            beamables.push(beamable);
          }
          beamable = [-1, -1];
        }
      }
      if (beamable[1] > 0) {
        beamables.push(beamable);
      }
      for (let i = 0; i < beamables.length; i++) {
        let current = beamables[i];
        let l = 0,
          r = this.beams.length;
        let merged = false;
        while (l < r) {
          // [--l--]--[--current--]
          if (current[0] > this.beams[l][1]) {
            l++;
            continue;
          }
          // [--current--]--[--l--]
          if (current[1] < this.beams[l][0]) {
            this.beams.splice(l, 0, beamable);
          } else {
            // [--current--[--]--l--]
            // [--l--[--current--]--]
            this.beams[l][0] = Math.min(this.beams[l][0], current[0]);
            this.beams[l][1] = Math.max(this.beams[l][1], current[1]);
          }
          merged = true;
          break;
        }
        if (!merged) {
          this.beams.push(current);
        }
      }
    }

    buildBeams(): Beam[] {
      return this.beams.map((beam) => new Beam(this.notes.slice(beam[0], beam[1] + 1), true));
    }

    buildTies(): StaveTie[] {
      return this.ties.map((tieParam) => {
        let param: {
          firstNote?: Note | null;
          lastNote?: Note | null;
          firstIndexes?: number[];
          lastIndexes?: number[];
        } = {};
        if (tieParam.from != null) param.firstNote = this.notes[tieParam.from];
        if (tieParam.to != null) param.lastNote = this.notes[tieParam.to];
        return new StaveTie(param);
      });
    }

    buildSlurs(): Curve[] {
      return this.slurs.map(
        (slur) =>
          new VexFlow.Curve(
            slur[0] == undefined ? undefined : this.notes[slur[0]],
            slur[1] == undefined ? undefined : this.notes[slur[1]],
            {
              positionEnd: VexFlow.CurvePosition.NEAR_HEAD,
              // copy from vexflow curve_tests.ts
              xShift: -10,
              yShift: 30,
              cps: [
                { x: 0, y: 20 },
                { x: 0, y: 50 },
              ],
            },
          ),
      );
    }

    buildVoices(): Voice[] {
      return this.voices
        .filter((vr) => vr[0] < this.notes.length)
        .map((vr) =>
          new VexFlow.Voice(this.meter.toString())
            .setMode(VexFlow.Voice.Mode.SOFT)
            .addTickables(pc.notes.slice(vr[0], vr[1] + 1)),
        );
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
      pc.NewStave();
      part.toVex();
      morePart.toVex();
    },

    // MusicCode(...children) {
    // },

    // MusicCodePart alternatives
    // MusicCodePart_noteseq(seq) { return seq.toVex(); },
    // MusicCodePart_rest(r) { return r.toVex(); },
    MusicCodePart_bar(bar) {
      let voice = pc.CurrentVoice();
      voice[1] = pc.notes.length - 1;
      pc.NewStave();
      pc.NewVoice();
    },
    MusicCodePart_slurStart(s) {
      s.toVex();
    },
    MusicCodePart_slurEnd(s) {
      s.toVex();
    },
    slurStart(_) {
      pc.slurs.push([pc.notes.length, undefined]);
    },
    slurEnd(_) {
      let to = pc.notes.length - 1 < 0 ? undefined : pc.notes.length - 1;
      if (pc.slurs.length == 0) {
        pc.slurs.push([undefined, to]);
        return;
      }
      let slur = pc.slurs[pc.slurs.length - 1];
      if (slur[1] == undefined) {
        slur[1] = to;
      } else {
        pc.slurs.push([undefined, to]);
      }
    },

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

    baseNoteGroup_binary(lg, sp1, o, sp2, rg) {
      lg.toVex();
      let l = pc.notes.length - 1;
      rg.toVex();
      let r = l + 1;

      let nl = pc.notes[l];
      let nr = pc.notes[r];
      const ops = o.toVex();
      for (let i = 0; i < ops.length; i++) {
        if (ops[i].op == "broken") {
          let n = ops[i].dots;
          let nlDura = nl.getTicks().clone().divide(VexFlow.RESOLUTION).simplify();
          let nrDura = nr.getTicks().clone().divide(VexFlow.RESOLUTION).simplify();
          if (!nlDura.equals(nrDura)) {
            throw new Error("can not use '>' to connect unequal length notes");
          }
          if (nl.isDotted() || nr.isDotted()) {
            throw new Error("notes around '>' cannot be dotted as one of note cannot be halved");
          }

          let nlNewDura: Fraction, nrNewDura: Fraction;
          if (n > 0) {
            nlNewDura = nlDura.clone();
            // 1/4 + 1/8 + 1/16
            for (let i = 1; i <= n; i++) {
              let h = nlDura.divide(Math.pow(2, i));
              nlNewDura.add(h);
            }
            nrNewDura = nrDura.clone().divide(Math.pow(2, n));
          } else {
            n = -n;
            nrNewDura = nrDura.clone();
            for (let i = 1; i <= n; i++) {
              let h = nrDura.divide(Math.pow(2, i));
              nrNewDura.add(h);
            }
            nlNewDura = nlDura.clone().divide(Math.pow(2, n));
          }
          pc.notes[l] = nl = pc.NewNote(nl.getKeys(), nlNewDura.multiply(pc.unitNoteLength));
          pc.notes[r] = nr = pc.NewNote(nr.getKeys(), nrNewDura.multiply(pc.unitNoteLength));
        } else if (ops[i].op == "tie") {
          pc.ties.push({
            from: l,
            to: r,
            firstIndexes: [0],
            lastIndexes: [0],
          });
        }
      }
      if (sp1.sourceString.length == 0 && sp2.sourceString.length == 0) {
        pc.createBeam(l, r);
      }
    },

    NoteConstruct(gn, chordedNote) {
      gn.toVex();
      return chordedNote.toVex();
    },

    GraceNote(_lb, bns, _rb) {
      bns.children.map((n) => n.toVex());
    },

    ChordedNote(ca, annotatedNote) {
      ca.toVex();
      return annotatedNote.toVex();
    },

    // return a list of operators
    binaryOps(ops) {
      return ops.children.map((o) => o.toVex());
    },

    binaryOp_broken(op) {
      let dots = op.sourceString.length;
      if (op.sourceString.indexOf("<") != -1) {
        dots = -dots;
      }
      return { type: "op", op: "broken", dots };
    },

    binaryOp_tie(op) {
      return { type: "op", op: "tie" };
    },

    NoteGroup(ca, baseNoteGroup) {
      baseNoteGroup.toVex();
    },

    baseNoteGroup_chord(_open, _sp1, chordnotes, _sp2, _close, maybeLen) {
      let notes = chordnotes.toVex();
      let keys = [];
      let dur = new Fraction(0, 1);
      for (let i = 0; i < notes.length; i++) {
        let note = notes[i] as StaveNote;
        keys.push(...note.getKeys());
        if (dur.equals(0)) {
          dur = note.getTicks().clone().divide(VexFlow.RESOLUTION).simplify().multiply(pc.unitNoteLength);
        }
      }
      if (maybeLen.children.length) {
        let d = maybeLen.children[0].toVex();
        dur = new Fraction(d.num, d.den);
      }
      pc.notes.push(pc.NewNote(keys, dur));
    },

    chordnote(first, _sp, rest) {
      let o = [first.toVex()];
      o.push(...rest.children.map((c) => c.toVex()));
      return o;
    },

    // return a list of StaveNote which should be beamed
    baseNoteGroup(notes) {
      notes.toVex();
    },

    beamedNotes(notes) {
      let start = pc.notes.length;
      pc.notes.push(...notes.children.map((n) => n.toVex()));
      let end = pc.notes.length - 1;
      pc.createBeam(start, end);
    },

    // return a single StaveNote
    annotatedNote(maybeAnnotationOp, _sp1, maybeSlurStart, _sp2, baseNote) {
      maybeSlurStart.toVex();
      return baseNote.toVex();
    },

    baseNote(_acc, pitch, maybeLen) {
      const p = pitch.toVex();
      let notelen = new Fraction(1, 1);
      if (maybeLen.children.length) {
        let dur = maybeLen.children[0].toVex();
        notelen = new Fraction(dur.num, dur.den);
      }
      return pc.NewNote([p.value], notelen);
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
      return { type: "noteLen", num: 1, den: Math.pow(2, slashes.sourceString.length) };
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
  let renderer: Renderer;
  function toVex() {
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

    // let cfg = VexflowConfig.create({ fontFamily: "Bravura" });
    renderer = new VexFlow.Renderer("abcvex", VexFlow.Renderer.Backends.SVG);
    renderer.resize(pc.staveX, 200);
    let rctx = renderer.getContext();
    // const stave = new Stave(0, 0, 400, { spaceAboveStaffLn: 8, spaceBelowStaffLn: 8 });
    // stave.addClef("treble");
    // stave.addTimeSignature(pc.meter.toString());
    pc.staves.forEach((stave) => stave.setContext(rctx).drawWithStyle());

    let beams = pc.buildBeams();
    let ties = pc.buildTies();
    let slurs = pc.buildSlurs();
    let voices = pc.buildVoices();
    let formatter = new VexFlow.Formatter();
    for (let i = 0; i < pc.staves.length; i++) {
      if (voices[i] != undefined) {
        formatter.joinVoices([voices[i]]).formatToStave([voices[i]], pc.staves[i], {
          alignRests: true,
          stave: pc.staves[i],
        });
      }
    }
    voices.forEach((voice) => voice.setContext(rctx).drawWithStyle());
    beams.forEach((beam) => beam.setContext(rctx).drawWithStyle());
    ties.forEach((tie) => tie.setContext(rctx).drawWithStyle());
    slurs.forEach((slur) => slur.setContext(rctx).drawWithStyle());
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
