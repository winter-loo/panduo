import parseCommon from "../parse/abc_common";

const parseCommonTyped = parseCommon as { cloneArray<T>(arr: T[]): T[] };

const PERCUSSION_PROGRAM = 128;
const BAGPIPE_PROGRAM = 71;
const DEFAULT_QPM = 180;

const dynamics: Record<string, [number, number, number, number]> = {
  pppp: [15, 10, 5, 1],
  ppp: [30, 20, 10, 1],
  pp: [45, 35, 20, 1],
  p: [60, 50, 35, 1],
  mp: [75, 65, 50, 1],
  mf: [90, 80, 65, 1],
  f: [105, 95, 80, 1],
  ff: [120, 110, 95, 1],
  fff: [127, 125, 110, 1],
  ffff: [127, 125, 110, 1],
};

type NumericLike = number | string | undefined;

type MidiEvent = {
  el_type: string;
  timing?: number;
  [key: string]: unknown;
};

export type MidiVoice = MidiEvent[];

type MidiEventList = MidiEvent[];

export interface SequenceOptions {
  program?: number | string;
  midiTranspose?: number | string;
  channel?: number | string;
  qpm?: number | string;
  defaultQpm?: number;
  drum?: string;
  drumBars?: number | string;
  drumIntro?: number | string;
  drumOff?: boolean;
}

interface NormalizedOptions {
  program: number;
  transpose: number;
  channel: number;
  drumPattern: string[];
  drumBars: number;
  drumIntro: number;
  drumOffAfterIntro: boolean;
  drumOn: boolean;
  qpm?: number;
  defaultQpm?: number;
}

interface MidiFormatting {
  program?: number[];
  transpose?: number[];
  channel?: number[];
  drum?: string[];
  drumbars?: number[];
  drumon?: boolean;
  beat?: number[];
  nobeataccents?: boolean;
  drumoff?: boolean;
}

interface Formatting {
  bagpipes?: boolean;
  midi?: MidiFormatting;
}

interface TempoMeta {
  duration?: number[];
  bpm?: number;
}

interface MetaText {
  tempo?: TempoMeta;
}

interface AbcTune {
  visualTranspose?: number;
  formatting: Formatting;
  metaText: MetaText;
  lines: AbcLine[];
  getBeatLength(): number;
  getPickupLength(): number;
}

interface AbcLine {
  staff?: AbcStaff[];
}

interface AbcStaff {
  clef?: AbcClef;
  key?: AbcKeySignature;
  meter?: AbcMeter;
  voices: AbcVoice[];
  title?: string[];
}

interface AbcClef {
  type?: string;
  transpose?: number;
}

interface AbcKeySignature {
  root?: string;
  accidentals: AbcAccidental[];
}

interface AbcAccidental {
  acc: string;
  note: string;
}

interface AbcMeter {
  type: string;
  value: Array<{ num: number; den: number }>;
  num?: number;
  den?: number;
}

interface TempoDirective {
  duration?: number[];
  bpm?: number;
}

interface TempoEvent extends MidiEvent {
  el_type: "tempo";
  qpm: number;
}

interface MeterElement extends MidiEvent {
  el_type: "meter";
  num?: number;
  den?: number;
  type?: string;
  value?: Array<{ num: number; den: number }>;
}

interface BarElement extends MidiEvent {
  el_type: "bar";
  type?: string;
  startEnding?: string;
}

interface ClefElement extends MidiEvent {
  el_type: "clef";
  type?: string;
  transpose?: number;
}

interface StyleElement extends MidiEvent {
  el_type: "style";
  head?: string;
}

interface MidiCommandElement extends MidiEvent {
  el_type: "midi";
  cmd: string;
  params: Array<number | string> | number | string;
}

interface NoteElement extends MidiEvent {
  el_type: "note";
  duration: number;
  rest?: { type?: string };
  startTriplet?: number;
  endTriplet?: boolean;
  tripletMultiplier?: number;
  tripletR?: number;
  decoration?: string[];
  style?: string;
  pitches?: NotePitch[];
  gracenotes?: NotePitch[];
  chord?: NotePitch[];
}

type NotePitch = Record<string, unknown>;

type VoiceElement = NoteElement | BarElement | ClefElement | MidiCommandElement | StyleElement | MeterElement | MidiEvent;

type AbcVoice = VoiceElement[];

export default function sequence(abctune: AbcTune, options: SequenceOptions = {}): MidiVoice[] {
  const normalized = normalizeOptions(options);
  let measureLength = 1;

  let {
    program,
    transpose,
    channel,
    drumPattern,
    drumBars,
    drumIntro,
    drumOffAfterIntro,
    drumOn,
  } = normalized;

  if (typeof abctune.visualTranspose === "number") {
    transpose -= abctune.visualTranspose;
  }

  if (channel === 10) {
    program = PERCUSSION_PROGRAM;
  }

  if (abctune.formatting?.bagpipes) {
    program = BAGPIPE_PROGRAM;
  }

  const startingMidi: MidiEventList = [];
  let channelExplicitlySet = false;

  if (abctune.formatting?.midi) {
    const globals = abctune.formatting.midi;

    if (globals.program && globals.program.length > 0) {
      const chan = globals.program.length > 1 ? toInt(globals.program[0], channel) : channel;
      const prog = globals.program.length > 1 ? toInt(globals.program[1], program) : toInt(globals.program[0], program);
      channel = chan;
      program = prog;
      channelExplicitlySet = true;
    }

    if (globals.transpose && globals.transpose.length > 0) {
      transpose = toInt(globals.transpose[0], transpose);
    }

    if (globals.channel && globals.channel.length > 0) {
      channel = toInt(globals.channel[0], channel);
      channelExplicitlySet = true;
    }

    if (globals.drum) {
      drumPattern = splitPattern(globals.drum);
      drumOn = true;
    }

    if (globals.drumbars && globals.drumbars.length > 0) {
      drumBars = toInt(globals.drumbars[0], drumBars);
    }

    if (globals.drumon) {
      drumOn = true;
    }

    if (globals.beat) {
      startingMidi.push({ el_type: "beat", beats: [...globals.beat] });
    }

    if (globals.nobeataccents) {
      startingMidi.push({ el_type: "beataccents", value: false });
    }

    if (channel === 10) {
      program = PERCUSSION_PROGRAM;
    }
  }

  let qpm = resolveTempo(normalized, abctune);

  const startVoice = buildStartVoice({
    bagpipes: Boolean(abctune.formatting?.bagpipes),
    program,
    channel,
    transpose,
    qpm,
    startingMidi,
  });

  const voices: MidiVoice[] = [];
  const clefTransposeActive: boolean[] = [];
  const inCrescendo: Array<number | false> = [];
  const inDiminuendo: Array<number | false> = [];
  const durationCounter: number[] = [];
  const startRepeatPlaceholder: Array<number | undefined> = [];
  const skipEndingPlaceholder: Array<number | undefined> = [];
  const styleByVoice: Array<string | undefined> = [];
  const tempoChanges: Record<string, TempoEvent> = {
    "0": { el_type: "tempo", qpm, timing: 0 },
  };
  let drumHeaderInserted = false;
  let rhythmHeadThisBar = false;

  for (const line of abctune.lines) {
    if (!line.staff) {
      continue;
    }

    let voiceNumber = 0;

    for (const staff of line.staff) {
      if (staff.clef?.type === "TAB") {
        continue;
      }

      for (let voiceIdx = 0; voiceIdx < staff.voices.length; voiceIdx++) {
        const voice = staff.voices[voiceIdx];
        const slotIndex = voiceIdx;
        if (!voices[voiceNumber]) {
          voices[voiceNumber] = cloneVoiceTemplate(startVoice, getTrackTitle(line.staff, voiceNumber));
        }

        if (transpose && staff.clef?.type === "perc") {
          voices[voiceNumber].push({ el_type: "transpose", transpose: 0 });
        }

        if (staff.clef?.type === "perc" && !channelExplicitlySet) {
          for (const event of voices[voiceNumber]) {
            if (event.el_type === "instrument") {
              event.program = PERCUSSION_PROGRAM;
            }
          }
        } else if (staff.key) {
          addKey(voices[voiceNumber], staff.key);
        }

        if (staff.meter) {
          const newMeter = interpretMeter(staff.meter);
          if (newMeter.num && newMeter.den) {
            measureLength = newMeter.num / newMeter.den;
          }
          addIfDifferent(voices[voiceNumber], newMeter);
        }

        if (!staff.clef?.type && clefTransposeActive[voiceNumber]) {
          voices[voiceNumber].push({ el_type: "transpose", transpose: 0 });
          clefTransposeActive[voiceNumber] = false;
        }

        if (!drumHeaderInserted && drumOn) {
          voices[voiceNumber].push({
            el_type: "drum",
            params: { pattern: drumPattern, bars: drumBars, on: drumOn, intro: drumIntro },
          });
          drumHeaderInserted = true;
        }

        if (staff.clef?.transpose && staff.clef.type !== "perc") {
          voices[voiceNumber].push({ el_type: "transpose", transpose: staff.clef.transpose });
          clefTransposeActive[voiceNumber] = false;
        }

        if (staff.clef?.type) {
          if (staff.clef.type.includes("-8")) {
            voices[voiceNumber].push({ el_type: "transpose", transpose: -12 });
            clefTransposeActive[voiceNumber] = true;
          } else if (staff.clef.type.includes("+8")) {
            voices[voiceNumber].push({ el_type: "transpose", transpose: 12 });
            clefTransposeActive[voiceNumber] = true;
          } else if (clefTransposeActive[voiceNumber]) {
            voices[voiceNumber].push({ el_type: "transpose", transpose: 0 });
            clefTransposeActive[voiceNumber] = false;
          }
        }

        if (abctune.formatting?.midi?.drumoff) {
          voices[voiceNumber].push({ el_type: "bar" });
          voices[voiceNumber].push({ el_type: "drum", params: { pattern: "", on: false } });
        }

        let noteEventsInBar = 0;
        let tripletMultiplier = 0;
        let tripletDurationTotal = 0;
        let tripletDurationCount = 0;
        let currentVolume = [...dynamics.f];

        if (typeof durationCounter[voiceNumber] !== "number") {
          durationCounter[voiceNumber] = 0;
        }

        for (let v = 0; v < voice.length; v++) {
          const elem = voice[v];

          const applyDynamics = (element: VoiceElement) => {
            const deco = (element as NoteElement).decoration;
            if (!deco) {
              return;
            }

            const marks = Array.isArray(deco) ? deco : [deco];
            let dynamicType: string | undefined;
            for (const mark of marks) {
              if (mark in dynamics) {
                dynamicType = mark;
                break;
              }
            }

            if (dynamicType) {
              currentVolume = [...dynamics[dynamicType]];
              const volumesPerNotePitch = marks
                .filter((mark) => mark in dynamics)
                .map((mark) => [...dynamics[mark]]);
              voices[voiceNumber].push({
                el_type: "beat",
                beats: [...currentVolume],
                volumesPerNotePitch: volumesPerNotePitch.length ? volumesPerNotePitch : undefined,
              });
              inCrescendo[slotIndex] = false;
              inDiminuendo[slotIndex] = false;
            }

            if (marks.includes("crescendo(")) {
              const n = numNotesToDecoration(voice, v, "crescendo)");
              let top = Math.min(127, currentVolume[0] + 50);
              const endDec = endingVolume(voice, v + n + 1, Object.keys(dynamics));
              if (endDec && endDec in dynamics) {
                top = dynamics[endDec][0];
              }
              inCrescendo[slotIndex] = n > 0 ? Math.floor((top - currentVolume[0]) / n) : false;
              inDiminuendo[slotIndex] = false;
            } else if (marks.includes("crescendo)")) {
              inCrescendo[slotIndex] = false;
            } else if (marks.includes("diminuendo(")) {
              const n = numNotesToDecoration(voice, v, "diminuendo)");
              let bottom = Math.max(15, currentVolume[0] - 50);
              const endDec = endingVolume(voice, v + n + 1, Object.keys(dynamics));
              if (endDec && endDec in dynamics) {
                bottom = dynamics[endDec][0];
              }
              inCrescendo[slotIndex] = false;
              inDiminuendo[slotIndex] = n > 0 ? Math.floor((bottom - currentVolume[0]) / n) : false;
            } else if (marks.includes("diminuendo)")) {
              inDiminuendo[slotIndex] = false;
            }
          };

          switch (elem.el_type) {
            case "note": {
              const note = elem as NoteElement;

              if (inCrescendo[slotIndex]) {
                currentVolume = currentVolume.map((value, index) => (index < 3 ? value + (inCrescendo[slotIndex] as number) : value)) as [
                  number,
                  number,
                  number,
                  number
                ];
                voices[voiceNumber].push({ el_type: "beat", beats: [...currentVolume] });
              }

              if (inDiminuendo[slotIndex]) {
                currentVolume = currentVolume.map((value, index) => (index < 3 ? value + (inDiminuendo[slotIndex] as number) : value)) as [
                  number,
                  number,
                  number,
                  number
                ];
                voices[voiceNumber].push({ el_type: "beat", beats: [...currentVolume] });
              }

              applyDynamics(note);

              if (!note.rest || note.rest.type !== "spacer") {
                const timing = durationCounter[voiceNumber] ?? 0;
                const noteEvent: MidiEvent = {
                  elem: note,
                  el_type: "note",
                  timing,
                };

                if (note.style) {
                  noteEvent.style = note.style;
                } else if (styleByVoice[voiceNumber]) {
                  noteEvent.style = styleByVoice[voiceNumber];
                }

                let duration = note.duration === 0 ? 0.25 : note.duration;

                if (note.startTriplet && note.tripletMultiplier) {
                  tripletMultiplier = note.tripletMultiplier;
                  tripletDurationTotal = note.startTriplet * tripletMultiplier * note.duration;
                  if (note.startTriplet !== note.tripletR && note.tripletR) {
                    let durationTotal = 0;
                    for (let w = v; w < Math.min(v + note.tripletR, voice.length); w++) {
                      durationTotal += Number(voice[w].duration) || 0;
                    }
                    tripletDurationTotal = tripletMultiplier * durationTotal;
                  }
                  duration = Math.round(duration * tripletMultiplier * 1e6) / 1e6;
                  tripletDurationCount = duration;
                } else if (tripletMultiplier) {
                  if (note.endTriplet) {
                    tripletMultiplier = 0;
                    duration = Math.round((tripletDurationTotal - tripletDurationCount) * 1e6) / 1e6;
                  } else {
                    duration = Math.round(duration * tripletMultiplier * 1e6) / 1e6;
                    tripletDurationCount += duration;
                  }
                }

                noteEvent.duration = duration;

                if (note.rest) noteEvent.rest = note.rest;
                if (note.decoration) noteEvent.decoration = [...note.decoration];
                if (note.pitches) noteEvent.pitches = parseCommonTyped.cloneArray(note.pitches);
                if (note.gracenotes) noteEvent.gracenotes = parseCommonTyped.cloneArray(note.gracenotes);
                if (note.chord) noteEvent.chord = parseCommonTyped.cloneArray(note.chord);

                voices[voiceNumber].push(noteEvent);

                if (note.style === "rhythm") {
                  rhythmHeadThisBar = true;
                  chordVoiceOffThisBar(voices);
                }

                noteEventsInBar += 1;
                durationCounter[voiceNumber] = (durationCounter[voiceNumber] ?? 0) + duration;
              }
              break;
            }
            case "key":
            case "keySignature":
              addKey(voices[voiceNumber], elem);
              break;
            case "meter": {
              const newMeter = interpretMeter(elem as MeterElement);
              if (newMeter.num && newMeter.den) {
                measureLength = newMeter.num / newMeter.den;
              }
              addIfDifferent(voices[voiceNumber], newMeter);
              break;
            }
            case "clef": {
              const clef = elem as ClefElement;
              if (typeof clef.transpose === "number") {
                voices[voiceNumber].push({ el_type: "transpose", transpose: clef.transpose });
              }
              if (clef.type?.includes("-8")) {
                voices[voiceNumber].push({ el_type: "transpose", transpose: -12 });
              } else if (clef.type?.includes("+8")) {
                voices[voiceNumber].push({ el_type: "transpose", transpose: 12 });
              }
              break;
            }
            case "tempo": {
              const tempo = elem as TempoDirective;
              qpm = interpretTempo(tempo, abctune.getBeatLength());
              const tempoEvent: TempoEvent = { el_type: "tempo", qpm, timing: durationCounter[voiceNumber] ?? 0 };
              voices[voiceNumber].push(tempoEvent);
              tempoChanges[String(durationCounter[voiceNumber] ?? 0)] = tempoEvent;
              break;
            }
            case "bar": {
              if (noteEventsInBar > 0) {
                voices[voiceNumber].push({ el_type: "bar" });
              }
              applyDynamics(elem);
              noteEventsInBar = 0;
              const bar = elem as BarElement;
              const endRepeat = bar.type === "bar_right_repeat" || bar.type === "bar_dbl_repeat";
              const startEnding = bar.startEnding === "1";
              const startRepeat =
                bar.type === "bar_left_repeat" || bar.type === "bar_dbl_repeat" || bar.type === "bar_right_repeat";

              if (endRepeat) {
                const s = startRepeatPlaceholder[voiceNumber] ?? 0;
                const e = skipEndingPlaceholder[voiceNumber] ?? voices[voiceNumber].length;
                for (let z = s; z < e; z++) {
                  const item = { ...voices[voiceNumber][z] };
                  if (Array.isArray(item.pitches)) {
                    item.pitches = parseCommonTyped.cloneArray(item.pitches);
                  }
                  voices[voiceNumber].push(item);
                }
                skipEndingPlaceholder[voiceNumber] = undefined;
                startRepeatPlaceholder[voiceNumber] = undefined;
              }

              if (startEnding) {
                skipEndingPlaceholder[voiceNumber] = voices[voiceNumber].length;
              }
              if (startRepeat) {
                startRepeatPlaceholder[voiceNumber] = voices[voiceNumber].length;
              }
              rhythmHeadThisBar = false;
              break;
            }
            case "style":
              styleByVoice[voiceNumber] = (elem as StyleElement).head;
              break;
            case "timeSignature": {
              const meterEvent = interpretMeter(elem as MeterElement);
              if (meterEvent.num && meterEvent.den) {
                measureLength = meterEvent.num / meterEvent.den;
              }
              voices[voiceNumber].push(meterEvent);
              break;
            }
            case "midi": {
              const midiElem = elem as MidiCommandElement;
              let drumChange = false;
              const paramsArray = paramsToArray(midiElem.params);
              switch (midiElem.cmd) {
                case "drumon":
                  drumOn = true;
                  drumChange = true;
                  break;
                case "drumoff":
                  drumOn = false;
                  drumChange = true;
                  break;
                case "drum":
                  drumPattern = toStringArray(midiElem.params);
                  drumChange = true;
                  break;
                case "drumbars":
                  drumBars = firstNumeric(midiElem.params, drumBars);
                  drumChange = true;
                  break;
                case "channel":
                  if (firstNumeric(midiElem.params, channel) === 10) {
                    voices[voiceNumber].push({ el_type: "instrument", program: PERCUSSION_PROGRAM });
                  }
                  break;
                case "program":
                  voices[voiceNumber].push({ el_type: "instrument", program: firstNumeric(midiElem.params, program) });
                  channelExplicitlySet = true;
                  break;
                case "transpose":
                  voices[voiceNumber].push({ el_type: "transpose", transpose: firstNumeric(midiElem.params, 0) });
                  break;
                case "gchordoff":
                  voices[voiceNumber].push({ el_type: "gchordOn", tacet: true });
                  break;
                case "gchordon":
                  voices[voiceNumber].push({ el_type: "gchordOn", tacet: false });
                  break;
                case "beat":
                  voices[voiceNumber].push({ el_type: "beat", beats: paramsArray });
                  break;
                case "nobeataccents":
                  voices[voiceNumber].push({ el_type: "beataccents", value: false });
                  break;
                case "beataccents":
                  voices[voiceNumber].push({ el_type: "beataccents", value: true });
                  break;
                case "vol":
                case "volinc":
                  voices[voiceNumber].push({ el_type: midiElem.cmd, volume: firstNumeric(midiElem.params, 0) });
                  break;
                case "gchord":
                case "swing":
                case "bassvol":
                case "chordvol":
                  voices[voiceNumber].push({ el_type: midiElem.cmd, value: paramsArray });
                  break;
                case "drummap":
                  break;
                default:
                  break;
              }

              if (drumChange) {
                voices[voiceNumber].push({
                  el_type: "drum",
                  params: { pattern: drumPattern, bars: drumBars, intro: drumIntro, on: drumOn },
                });
              }
              break;
            }
            default:
              break;
          }
        }

        voiceNumber += 1;
      }
    }
  }

  insertTempoChanges(voices, tempoChanges);
  applyDrumIntro({
    voices,
    drumIntro,
    pickupLength: abctune.getPickupLength(),
    measureLength,
    drumPattern,
    drumBars,
    drumOn,
    drumOffAfterIntro,
  });

  if (voices.length > 0 && voices[0].length > 0) {
    voices[0][0].pickupLength = abctune.getPickupLength();
  }

  return voices;
}

function normalizeOptions(options: SequenceOptions): NormalizedOptions {
  const drumRaw = options.drum ?? "";
  return {
    program: toInt(options.program, 0),
    transpose: toInt(options.midiTranspose, 0),
    channel: toInt(options.channel, 0),
    drumPattern: splitPattern(drumRaw),
    drumBars: Math.max(1, toInt(options.drumBars, 1)),
    drumIntro: Math.max(0, toInt(options.drumIntro, 0)),
    drumOffAfterIntro: Boolean(options.drumOff),
    drumOn: drumRaw !== "",
    qpm: options.qpm !== undefined ? toInt(options.qpm, DEFAULT_QPM) : undefined,
    defaultQpm: options.defaultQpm,
  };
}

function resolveTempo(options: NormalizedOptions, abctune: AbcTune): number {
  if (typeof options.qpm === "number") {
    return options.qpm;
  }
  if (abctune.metaText?.tempo) {
    return interpretTempo(abctune.metaText.tempo as TempoDirective, abctune.getBeatLength());
  }
  if (typeof options.defaultQpm === "number") {
    return options.defaultQpm;
  }
  return DEFAULT_QPM;
}

function buildStartVoice({
  bagpipes,
  program,
  channel,
  transpose,
  qpm,
  startingMidi,
}: {
  bagpipes: boolean;
  program: number;
  channel: number;
  transpose: number;
  qpm: number;
  startingMidi: MidiEventList;
}): MidiEventList {
  const startVoice: MidiEventList = [];
  if (bagpipes) {
    startVoice.push({ el_type: "bagpipes" });
  }
  startVoice.push({ el_type: "instrument", program });
  if (channel) {
    startVoice.push({ el_type: "channel", channel });
  }
  if (transpose) {
    startVoice.push({ el_type: "transpose", transpose });
  }
  startVoice.push({ el_type: "tempo", qpm });
  for (const event of startingMidi) {
    startVoice.push({ ...event });
  }
  return startVoice;
}

function cloneVoiceTemplate(template: MidiEventList, name?: string): MidiVoice {
  const clone = template.map((event) => ({ ...event }));
  if (name) {
    clone.unshift({ el_type: "name", trackName: name });
  }
  return clone;
}

function toInt(value: NumericLike, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function getTrackTitle(staff: AbcStaff[] | undefined, voiceNumber: number): string | undefined {
  if (!staff || staff.length <= voiceNumber) {
    return undefined;
  }
  const title = staff[voiceNumber]?.title;
  return title ? title.join(" ") : undefined;
}

function interpretTempo(element: TempoDirective, beatLength: number): number {
  const duration = element.duration?.[0] ?? 0.25;
  const bpm = element.bpm ?? 60;
  return (duration * bpm) / beatLength;
}

function interpretMeter(element: Partial<MeterElement> | AbcMeter): MeterElement {
  let meter: MeterElement;
  switch (element.type) {
    case "common_time":
      meter = { el_type: "meter", num: 4, den: 4 };
      break;
    case "cut_time":
      meter = { el_type: "meter", num: 2, den: 2 };
      break;
    case "specified":
      meter = {
        el_type: "meter",
        num: element.value?.[0]?.num,
        den: element.value?.[0]?.den,
      };
      break;
    default:
      meter = { el_type: "meter" };
      break;
  }
  return meter;
}

function addKey(target: MidiVoice, key: AbcKeySignature | MidiEvent): void {
  const accidentals = "accidentals" in key && Array.isArray((key as AbcKeySignature).accidentals)
    ? removeNaturals((key as AbcKeySignature).accidentals)
    : [];
  const newKey: MidiEvent =
    key.root === "HP"
      ? {
        el_type: "key",
        accidentals: [
          { acc: "natural", note: "g" },
          { acc: "sharp", note: "f" },
          { acc: "sharp", note: "c" },
        ],
      }
      : { el_type: "key", accidentals };
  addIfDifferent(target, newKey);
}

function removeNaturals(accidentals: AbcAccidental[]): AbcAccidental[] {
  return accidentals.filter((acc) => acc.acc !== "natural");
}

function addIfDifferent(target: MidiVoice, item: MidiEvent): void {
  for (let i = target.length - 1; i >= 0; i--) {
    if (target[i].el_type === item.el_type) {
      if (JSON.stringify(target[i]) !== JSON.stringify(item)) {
        target.push(item);
      }
      return;
    }
  }
  target.push(item);
}

function numNotesToDecoration(voice: AbcVoice, start: number, decoration: string): number {
  let counter = 0;
  for (let i = start + 1; i < voice.length; i++) {
    if (voice[i].el_type === "note") {
      counter += 1;
    }
    const decos = (voice[i] as NoteElement).decoration;
    if (decos?.includes(decoration)) {
      return counter;
    }
  }
  return counter;
}

type MidiCommandParams = MidiCommandElement["params"];

function paramsToArray(params: MidiCommandParams): Array<number | string> {
  if (Array.isArray(params)) {
    return [...params];
  }
  if (params === undefined || params === null) {
    return [];
  }
  return [params];
}

function firstNumeric(params: MidiCommandParams, fallback = 0): number {
  const arr = paramsToArray(params);
  return arr.length > 0 ? toInt(arr[0], fallback) : fallback;
}

function toStringArray(params: MidiCommandParams): string[] {
  return paramsToArray(params).map((value) => String(value));
}

function splitPattern(source: string[] | string): string[] {
  if (!source) {
    return [];
  }
  if (Array.isArray(source)) {
    return source.map((entry) => String(entry));
  }
  const trimmed = source.trim();
  return trimmed === "" ? [] : trimmed.split(/\s+/);
}

function endingVolume(voice: AbcVoice, start: number, volumeDecorations: string[]): string | null {
  const end = Math.min(voice.length, start + 3);
  for (let i = start; i < end; i++) {
    if (voice[i].el_type === "note") {
      const decos = (voice[i] as NoteElement).decoration;
      if (decos) {
        for (const deco of decos) {
          if (volumeDecorations.includes(deco)) {
            return deco;
          }
        }
      }
    }
  }
  return null;
}

function insertTempoChanges(voices: MidiVoice[], tempoChanges: Record<string, TempoEvent>): void {
  const changePositions = Object.keys(tempoChanges);
  for (const voice of voices) {
    let lastTempo = tempoChanges["0"]?.qpm ?? 0;
    for (let i = 0; i < voice.length; i++) {
      const event = voice[i];
      if (event.el_type === "tempo" && typeof event.qpm === "number") {
        lastTempo = event.qpm;
      }
      const key = typeof event.timing === "number" ? String(event.timing) : undefined;
      if (!key || !changePositions.includes(key)) {
        continue;
      }
      const change = tempoChanges[key];
      if (!change || lastTempo === change.qpm) {
        continue;
      }
      lastTempo = change.qpm;
      if (event.el_type === "tempo") {
        event.qpm = change.qpm;
        i += 1;
      } else {
        voice.splice(i, 0, { el_type: "tempo", qpm: change.qpm, timing: event.timing });
        i += 2;
      }
    }
  }
}

function chordVoiceOffThisBar(voices: MidiVoice[]): void {
  for (const voice of voices) {
    for (let i = voice.length - 1; i >= 0 && voice[i].el_type !== "bar"; i--) {
      voice[i].noChordVoice = true;
    }
  }
}

function applyDrumIntro({
  voices,
  drumIntro,
  pickupLength,
  measureLength,
  drumPattern,
  drumBars,
  drumOn,
  drumOffAfterIntro,
}: {
  voices: MidiVoice[];
  drumIntro: number;
  pickupLength: number;
  measureLength: number;
  drumPattern: string[];
  drumBars: number;
  drumOn: boolean;
  drumOffAfterIntro: boolean;
}): void {
  if (drumIntro <= 0) {
    return;
  }
  for (const voice of voices) {
    let insertPoint = 0;
    while (insertPoint < voice.length && voice[insertPoint].el_type !== "note") {
      insertPoint += 1;
    }
    if (insertPoint >= voice.length) {
      continue;
    }
    for (let w = 0; w < drumIntro; w++) {
      if (pickupLength === 0 || w < drumIntro - 1) {
        voice.splice(insertPoint, 0, { el_type: "note", rest: { type: "rest" }, duration: measureLength }, { el_type: "bar" });
        insertPoint += 2;
      } else {
        voice.splice(insertPoint, 0, {
          el_type: "note",
          rest: { type: "rest" },
          duration: measureLength - pickupLength,
        });
        insertPoint += 1;
      }
    }
    if (drumOffAfterIntro) {
      voice.splice(insertPoint, 0, {
        el_type: "drum",
        params: { pattern: drumPattern, bars: drumBars, intro: drumIntro, on: drumOn },
      });
      drumOffAfterIntro = false;
    }
  }
}
