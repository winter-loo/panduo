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
    // GlyphFont,
    BarNote,
    BarlineType,
    Accidental,
    KeySignature,
    TimeSignature,
    CurvePosition,
  } from "vexflow";

  const abcGrammar = ohm.grammar(abcNotation);

  let abcInputText = $state(`
X: 5
T:Princess Royal, Stanton Harcourt
M:4/4
L:1/8
Q:1/4=120
A:Stanton Harcourt
P:A2B4
K:Gm
P:A
GA|B2AB G2cB |B2AB G2d2|e2c2  cdef|d2c2 B3d |
ccB2 A2G2 |FGFE D2d2|cBAG  F2A2|G4   G2 ||
P:B
d=e|f2d2 d=efd|g2d2 c4  |gg=ed cBAG|A2F2 F4  |
G2GA B2B2 |c2c2 g2g2|f2d2  e2fe|d2G2 c2dc|
BAGF GABc |d2d2 G2d2|cBAG  F2A2|G4   G2 ||
`);

  class ParseContext {
    _unitNoteLength: number | null = null;
    // default: free meteer
    meter: Fraction = new Fraction(0, 1);
    notes: Note[] = [];
    beams: [number, number][] = [];
    ties: {
      from?: number | null;
      to?: number | null;
      firstIndexes?: number[];
      lastIndexes?: number[];
    }[] = [];
    slurs: [number | undefined, number | undefined][] = [];
    staves: Stave[] = [];
    currentStave: Stave | null = null;

    // Song metadata state
    title: string = "";
    keySignature: string = "C";
    timeSignature: string | null = null;
    clef: string = "treble";
    tempo: { duration: string; bpm: number } | null = null;
    nextRehearsalMark: string | null = null;

    staveX: number = 0;
    staveY: number = 0;
    // Each stave is a measure.
    // Multiple measures make up a System (one horizontal row).
    // Multiple Systems make up the full sheet of music (stacked vertically).
    systems: Stave[][] = [];
    staveWidth: number = 180;
    maxStaveWidth: number = 180;
    voices: [number, number][] = [];

    constructor() {
      this.reset();
    }
    reset() {
      this._unitNoteLength = null;
      this.title = "";
      this.meter = new Fraction(0, 1);
      this.keySignature = "C";
      this.timeSignature = null;
      this.clef = "treble";
      this.tempo = null;
      this.nextRehearsalMark = null;
      this.notes = [];
      this.beams = [];
      this.ties = [];
      this.slurs = [];
      this.staves = [];
      this.systems = [[]];
      this.currentStave = null;
      this.staveX = 0;
      this.staveY = 0;
      this.voices = [];
    }

    NewStave(): Stave {
      const currentSystemIndex = this.systems.length - 1;
      const isFirstInSystem = this.systems[currentSystemIndex].length === 0;
      const isFirstInScore = this.staves.length === 0;

      let w = this.staveWidth;
      if (isFirstInSystem) {
        w += 60; // Extra space for Clef, Key, Time signatures
      }

      const stave = new Stave(this.staveX, 0, w, {
        spaceAboveStaffLn: 0,
        spaceBelowStaffLn: 0,
        leftBar: false,
        rightBar: false,
      });

      // Apply modifiers only at start of system or if changed (logic simplified for start of system)
      // ... (code for adding modifiers remains, effectively using the extra space) ...

      if (isFirstInSystem) {
        stave.addClef(this.clef);
        if (this.keySignature) {
          stave.addKeySignature(this.keySignature);
        }
      }

      // Time signature only at very beginning (or if we supported changes mid-stream)
      if (isFirstInScore && this.timeSignature) {
        stave.addTimeSignature(this.timeSignature);
      }

      // Add tempo marking if pending
      if (this.tempo) {
        stave.setTempo({ duration: this.tempo.duration, dots: 0, bpm: this.tempo.bpm }, 0);
        this.tempo = null; // Clear
      }

      // Add Rehearsal Mark if pending
      if (this.nextRehearsalMark) {
        // Use SystemText or similar for Rehearsal Marks, or Section modifiers
        stave.setSection(this.nextRehearsalMark, 0);
        this.nextRehearsalMark = null;
      }

      this.staves.push(stave);
      if (this.systems.length === 0) this.systems.push([]);
      this.systems[this.systems.length - 1].push(stave);

      this.staveX += w;
      this.maxStaveWidth = Math.max(this.staveX, this.maxStaveWidth);

      // Visual fix: make staves look connected
      // If not the first stave in system, remove the begin bar (clef/key/time takes care of "headers", but barline is separate)
      if (!isFirstInSystem) {
        stave.setBegBarType(BarlineType.NONE);
      }

      return stave;
    }

    // should be invoked on note createtion, i.e., baseNote
    CurrentStave(): Stave {
      if (this.currentStave == null) {
        this.currentStave = this.NewStave();
        this.NewVoice();
      }
      return this.currentStave;
    }

    // REQUIRES: new voice then push notes
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
      return this.beams.map((beam) => new Beam(this.notes.slice(beam[0], beam[1] + 1) as StemmableNote[], true));
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
              positionEnd: CurvePosition.NEAR_HEAD,
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

    buildVoices(): (Voice | undefined)[] {
      let voices: (Voice | undefined)[] = [];
      for (let i = 0; i < this.voices.length; i++) {
        if (i + 1 == this.voices.length && this.voices[i][0] >= this.notes.length) break;
        let vr = this.voices[i];
        // empty voice
        if (vr[1] - vr[0] < 0) {
          voices.push(undefined);
        } else {
          voices.push(
            new Voice(this.meter.toString()).setMode(Voice.Mode.SOFT).addTickables(pc.notes.slice(vr[0], vr[1] + 1)),
          );
        }
      }
      return voices;
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

    File(_sp1, fileHeaders, _sp2, _sp3, tunebook) {
      fileHeaders.toVex();
      tunebook.toVex();
    },
    // use ohm '_default' semantic action for undefined non terminals
    FileHeaders(first, _eol, rest) {
      first.toVex();
      rest.children.map((h) => h.toVex());
    },

    FileHeader_unknown(_) {
      console.warn("unknown file header field: ", this.sourceString);
    },

    ReservedHeaderOnlyField(_key, _value) {},

    TuneBook(firstTune, _sp1, _sp2, restTunes, _sp3) {
      firstTune.toVex();
      restTunes.children.map((t) => t.toVex());
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

    // use ohm '_default' semantic action for ReservedTuneHeaderField
    TuneHeaderField(f) {
      f.toVex();
    },

    Field_X(_x, number) {
      console.log("tune id=", this.sourceString);
    },

    Field_T(_t, title) {
      pc.title = title.sourceString.trim();
    },

    Field_P(_p, part) {
      pc.nextRehearsalMark = part.sourceString.trim();
    },

    Field_W(_w, words) {},

    Field_Q(_q, tempo) {
      // Format: 1/4=120
      const t = tempo.toVex();
      if (t) {
        pc.tempo = t;
      }
    },

    QKeyedValue(_str1, num1, _slash, num2, _eq, bpm, _str2) {
      // rule: dqTextString? (number "/" number "=")? number dqTextString?
      // args: 7
      // num1, _slash, num2, _eq are all iteration nodes (0 or 1 element) due to the optional group

      if (num1.children.length > 0 && num2.children.length > 0) {
        const n = num1.children[0].toVex(); // { type: 'number', num: ... }
        const d = num2.children[0].toVex(); // { type: 'number', num: ... }

        // default: quarter
        let duration = "q";
        if (d.num === 2) duration = "h";
        if (d.num === 1) duration = "w";
        if (d.num === 8) duration = "8";
        if (d.num === 16) duration = "16";

        return { duration: duration, bpm: Number(bpm.sourceString) };
      }
      // If just number, assume quarter note?
      return { duration: "q", bpm: Number(bpm.sourceString) };
    },

    Field_K(_k, tonic, mode, _sp, accidental, noteName) {
      // Parse key. VexFlow keys: "C", "Am", "F#", "Gb", etc.
      // ABC tonic: C, C#, Cb
      // ABC mode: maj, min, m, etc.
      let k = tonic.sourceString;
      // Normalize ABC accidentals # and b are fine. ABC uses 'b' for flat.
      // Check mode
      let m = "";
      if (mode.children.length > 0) {
        m = mode.children[0].sourceString;
      }

      // Map ABC mode to VexFlow key signature format
      // VexFlow `KeySignature` expects major keys (e.g. "C", "F#", "Bb") or minor keys ("Am", "F#m").
      // Actually VexFlow supports various modes using key specs, but `addKeySignature` usually takes the root + 'm' for minor.

      let vfKey = k;
      if (
        m.startsWith("m") ||
        m === "Min" ||
        m === "Dor" ||
        m === "Phrygian" ||
        m === "Lyd" ||
        m === "Mix" ||
        m === "Loc"
      ) {
        // Simplify: if it's minor, append 'm'. VexFlow handles relative minor keys automatically?
        // "Gm" is valid in
        // What about modes? "D Mixolydian" -> G major signature.
        // VexFlow KeySignature class usually handles standard keys.
        // If the user input "Gm", we pass "Gm".
        if (m.toLowerCase().startsWith("m")) {
          vfKey += "m";
        }
      }

      pc.keySignature = vfKey;

      // If we are mid-stream (staves already exist), we might need to add a key signature change to the *current* or *text* note?
      // Or if a new stave starts, it will pick this up.
      // ABC typically puts K: at start or inline.
      // If inline, it affects the *next* notes.
      // We'll update state, and if there's a current stave, we might need to add a key signature modifier.
      if (pc.currentStave) {
        pc.currentStave.addKeySignature(pc.keySignature);
      }
    },

    UnknownFileHeaderField(_k, _v) {
      console.warn("unknown file header field: ", this.sourceString);
    },

    UnknownTuneHeaderField(_k, _v) {
      console.warn("unknown tune header field: ", this.sourceString);
    },

    // TuneHeaderField_unknown(f) {
    //   console.warn('unknown tune header field: ', f.sourceString);
    // },

    // keySignatureSetting(_kcolon, _spaces, tonic, maybeMode, maybeAlt) {
    //   const key = tonic.sourceString + (maybeMode.children.length ? ' ' + maybeMode.children[0].sourceString : '');
    //   return {key: tonic.sourceString.toLowerCase(), mode: maybeMode.children.length ? maybeMode.children[0].sourceString : null};
    // },

    Field_L(_Lcolon, _one, _slash, unitNoteLength) {
      pc._unitNoteLength = Number(unitNoteLength.sourceString);
    },

    // A simple meter mapping, expects "M:" spaces noteLen
    Field_M(_Mcolon, value) {
      let v = value.sourceString;
      let r = new Fraction(0, 1); // free meter
      let timeSigString = "4/4"; // default for VexFlow rendering

      if (v == "C") {
        r = new Fraction(4, 4);
        timeSigString = "C";
      } else if (v == "C|") {
        r = new Fraction(2, 2);
        timeSigString = "C|";
      } else if (v == "none") {
        // use default value
        timeSigString = "";
      } else {
        r = value.toVex();
        timeSigString = r.numerator + "/" + r.denominator;
      }
      pc.meter = r;
      pc.timeSignature = timeSigString;

      if (pc.currentStave && timeSigString) {
        pc.currentStave.addTimeSignature(timeSigString);
      }
    },

    fraction(num, _sp1, _slash, _sp2, den) {
      return new Fraction(Number(num.sourceString), Number(den.sourceString));
    },

    // tempoSetting(_Q, _sp, qv) {
    //   // qv returns numeric tempo in children
    //   return {tempo: qv.sourceString};
    // },

    // EOL actions to support system breaking checks
    eol_newline(_markers) {
      return { type: "newline" };
    },
    eol_lineComment(_markers, _comment) {
      return { type: "newline" }; // Comments at end of line still break the line
    },
    eol_lineContinue(_slash, _sp, _markers) {
      return { type: "continue" };
    },

    TuneBody(_l1, _e1, part, eol, morePart, _e3, _l2) {
      part.toVex();

      // eol and morePart are iterators of same length
      for (let i = 0; i < morePart.children.length; i++) {
        // eol.children[i] corresponds to the eol? before the part
        // The grammar is: (~(eol InBodyInfoFieldList) eol? TuneBodyPart)*
        // eol is the eol? node.

        let eolNode = eol.children[i];
        if (eolNode.children.length > 0) {
          let type = eolNode.children[0].toVex().type;
          if (type == "newline") {
            pc.staveX = 0;
            pc.systems.push([]);
            let voice = pc.CurrentVoice();
            if (voice != undefined) voice[1] = pc.notes.length - 1;
            pc.currentStave = null;
          }
        }

        morePart.children[i].toVex();
      }
    },

    TuneBodyPart_middle(part1, eol1, fields, eol2, part2) {
      part1.toVex();

      if (eol1.toVex().type == "newline") {
        pc.staveX = 0;
        pc.systems.push([]);
        let voice = pc.CurrentVoice();
        if (voice != undefined) voice[1] = pc.notes.length - 1;
        pc.currentStave = null;
      }

      fields.toVex();

      if (eol2.toVex().type == "newline") {
        pc.staveX = 0;
        pc.systems.push([]);
        let voice = pc.CurrentVoice();
        if (voice != undefined) voice[1] = pc.notes.length - 1;
        pc.currentStave = null;
      }

      part2.toVex();
    },

    InBodyInfoFieldList(field, _eol, restFields) {
      field.toVex();
      restFields.children.map((f) => f.toVex());
    },

    InBodyInfoField(f) {
      f.toVex();
    },

    InBodyInfoField_unknown(_) {
      console.warn("unknown in body info field: ", this.sourceString);
    },

    // MusicCode(...children) {
    // },

    // MusicCodePart alternatives
    // MusicCodePart_noteseq(seq) { return seq.toVex(); },
    // MusicCodePart_rest(r) { return r.toVex(); },
    MusicCodePart_bar(_bar) {
      let barType = BarlineType.NONE;
      if (this.sourceString == "|") {
        barType = BarlineType.SINGLE;
      } else if (this.sourceString == "||") {
        barType = BarlineType.DOUBLE;
      } else if (this.sourceString == "|]") {
        barType = BarlineType.END;
      } else if (this.sourceString == "|:") {
        barType = BarlineType.REPEAT_BEGIN;
      } else if (this.sourceString == ":|") {
        barType = BarlineType.REPEAT_END;
      } else if (this.sourceString == "::") {
        barType = BarlineType.REPEAT_BOTH;
      }
      const barNote = new BarNote(barType);

      if (pc.currentStave) {
        // right bar
        // push notes first so that the current voice includes this bar
        pc.notes.push(barNote);
        barNote.setStave(pc.currentStave);

        let voice = pc.CurrentVoice();
        if (voice != undefined) voice[1] = pc.notes.length - 1;
        // reset it so we can initialize a new stave lately on demand
        pc.currentStave = null;
      } else {
        // left bar
        // new voice first so that the new voice includes this bar
        barNote.setStave(pc.CurrentStave());
        pc.notes.push(barNote);
      }
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

    baseNote(acc, pitch, maybeLen) {
      const p = pitch.toVex();
      let notelen = new Fraction(1, 1);
      if (maybeLen.children.length) {
        let dur = maybeLen.children[0].toVex();
        notelen = new Fraction(dur.num, dur.den);
      }

      let note = pc.NewNote([p.value], notelen);

      // Handle Accidentals
      if (acc.children.length > 0) {
        // acc.children[0] is the accidental node
        // We need custom 'accidental' rule or just grab sourceString
        let accStr = acc.sourceString;
        // Map ABC accidentals to VexFlow
        // ^ = sharp (#)
        // ^^ = double sharp (##)
        // _ = flat (b)
        // __ = double flat (bb)
        // = = natural (n)
        let vfAcc = "";
        if (accStr === "^") vfAcc = "#";
        else if (accStr === "^^") vfAcc = "##";
        else if (accStr === "_") vfAcc = "b";
        else if (accStr === "__") vfAcc = "bb";
        else if (accStr === "=") vfAcc = "n";

        if (vfAcc) {
          note.addModifier(new Accidental(vfAcc));
        }
      }

      return note;
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

  // await GlyphFont.load("Bravura");
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
    let mr = abcGrammar.match(abcInputText, "File");

    try {
      semantics(mr).toVex();
    } catch (e) {
      if (e instanceof Error) errMessage = e.message;
      return;
    }

    // let cfg = VexflowConfig.create({ fontFamily: "Bravura" });
    // Reset staff HTML before drawing
    if (staffRef) staffRef.innerHTML = "";

    renderer = new VexFlow.Renderer("abcvex", VexFlow.Renderer.Backends.SVG);
    let rctx = renderer.getContext();
    // const stave = new Stave(0, 0, 400, { spaceAboveStaffLn: 8, spaceBelowStaffLn: 8 });
    // stave.addClef("treble");
    // stave.addTimeSignature(pc.meter.toString());

    let beams = pc.buildBeams();
    let ties = pc.buildTies();
    let slurs = pc.buildSlurs();
    let voices = pc.buildVoices();

    // 1. Format voices
    let formatter = new VexFlow.Formatter();
    for (let i = 0; i < pc.staves.length; i++) {
      if (voices[i] != undefined) {
        formatter.joinVoices([voices[i]!]).formatToStave([voices[i]!], pc.staves[i], {
          alignRests: true,
          stave: pc.staves[i],
        });
      }
    }

    // 2. Layout
    let currentY = 0;
    const PIXELS_PER_SPACE = 10;
    const DEFAULT_TOP_PADDING = 30; // pixels
    const DEFAULT_BOTTOM_PADDING = 30; // pixels
    const SYSTEM_SPACING = 50; // pixels between systems

    // Render Title if exists
    if (pc.title) {
      // Simple SVG text for title
      // rendering context text
      rctx.save();
      rctx.setFont("Times New Roman", 24, "bold"); // VexFlow font handling is tricky, simpler to use standard canvas/svg text if possible?
      // VexFlow RenderContext doesn't always support setFont clearly across backends?
      // Let's use standard VexFlow text drawing if possible, or just append HTML?
      // Renderer is SVG. We can't easily append HTML inside the SVG without foreignObject.
      // Let's try rctx.fillText
      rctx.fillText(pc.title, pc.maxStaveWidth / 2, 30);
      rctx.restore();
      currentY += 50;
    }

    for (let system of pc.systems) {
      if (system.length === 0) continue;

      let maxTopY = 0;
      let maxBottomY = 0;

      // First pass: Calculate required space
      for (let stave of system) {
        // Find voice for this stave
        const staveIndex = pc.staves.indexOf(stave);
        const voice = voices[staveIndex];

        let topY = stave.getYForLine(0); // Top line Y (0-indexed)
        let bottomY = stave.getYForLine(4); // Bottom line Y

        if (voice) {
          const bbox = voice.getBoundingBox();
          if (bbox) {
            // Check extension above
            // bbox.y is the top-most coordinate
            if (bbox.y < topY) {
              // Calculate spaces needed
              const pixelsAbove = topY - bbox.y;
              const spacesAbove = Math.ceil(pixelsAbove / PIXELS_PER_SPACE);
              // We want at least some padding
              // We kept the calculation to know how much to offset layout,
              // but we do NOT set it on the stave to avoid drawing tall barlines.
            }

            // Check extension below
            // bbox.y + bbox.h is bottom
            const voiceBottom = bbox.y + bbox.h;
            if (voiceBottom > bottomY) {
              const pixelsBelow = voiceBottom - bottomY;
              const spacesBelow = Math.ceil(pixelsBelow / PIXELS_PER_SPACE);
              // We kept the calculation to know how much to offset layout,
              // but we do NOT set it on the stave to avoid drawing tall barlines.
            }
          }
        }

        // After setting options, recalculate extents for layout
        // Note: setSection might not change getYForLine returns immediately if they are purely geometric based on Y,
        // but getBox or getHeight might change.
        // Actually we control Y, giving it space is about placing the next system.

        // We need to know the visual top and bottom of this stave relative to its Y=0 anchor
        // Stave Y is usually the top line? No, Stave Y is the top of the bounding box of the stave lines usually?
        // Actually: new Stave(x, y, ...). y is the top line of the staff.
        // Wait, let's verify VexFlow coordinate system.
        // Usually y passed to Stave constructor is the y position of the top line.

        // Let's just use the voice bounding box relative to stave.
        // But voice bounding box is absolute coordinates based on current stave Y.
        // Since we initialized staves with Y=0, the bounding box is relative to 0.

        if (voice) {
          const bbox = voice.getBoundingBox();
          if (bbox) {
            // bbox.y is absolute (currently relative to 0)
            // bbox.y might be negative if notes are very high
            // We need enough room above (negative Y)
            // maxTopY should be positive value of required space above 0
            if (bbox.y < -DEFAULT_TOP_PADDING) {
              maxTopY = Math.max(maxTopY, Math.abs(bbox.y));
            } else {
              maxTopY = Math.max(maxTopY, DEFAULT_TOP_PADDING);
            }

            // bbox.y + bbox.h is absolute bottom
            // bottom line of 5-line stave is at y=40 (approx 4 spaces * 10)
            const bottomLineY = 40;
            const voiceBottom = bbox.y + bbox.h;
            if (voiceBottom > bottomLineY + DEFAULT_BOTTOM_PADDING) {
              maxBottomY = Math.max(maxBottomY, voiceBottom - bottomLineY);
            } else {
              maxBottomY = Math.max(maxBottomY, DEFAULT_BOTTOM_PADDING);
            }
          } else {
            maxTopY = Math.max(maxTopY, DEFAULT_TOP_PADDING);
            maxBottomY = Math.max(maxBottomY, DEFAULT_BOTTOM_PADDING);
          }
        } else {
          maxTopY = Math.max(maxTopY, DEFAULT_TOP_PADDING);
          maxBottomY = Math.max(maxBottomY, DEFAULT_BOTTOM_PADDING);
        }
      }

      // Apply Layout
      // currentY is where the previous system ended.
      // We need to place the top line of current system such that we accommodate maxTopY.
      // So Stave Y = currentY + maxTopY.

      const systemStaveY = currentY + maxTopY;

      for (let stave of system) {
        stave.setY(systemStaveY);
      }

      // Advance currentY
      // The system lines take ~40px (for 5 lines).
      // Plus maxBottomY.
      // Plus spacing between systems.
      const staveHeight = 40; // 5 lines * 10 spacing = 40 height diff.
      currentY = systemStaveY + staveHeight + maxBottomY + SYSTEM_SPACING;
    }

    renderer.resize(pc.maxStaveWidth, currentY);

    pc.staves.forEach((stave) => stave.setContext(rctx).drawWithStyle());

    voices.forEach((voice) => voice?.setContext(rctx).drawWithStyle());
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
