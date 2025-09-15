<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { MetricsDefaults, Metrics, VexFlow } from '$lib/vexflow/vexflow-core';
  import { Accidental } from '$lib/vexflow/src/accidental';
  import { getVirtualMidiKeyboard } from '$lib/VirtualMidiKeyboard';

  type VFDuration = 'w' | 'h' | 'q' | '8' | '16' | '32';
  type NoteItem = { key: string; duration: VFDuration };
  type SavedScore = { id: string; name: string; imageUrl?: string; notes: NoteItem[] };

  const TEMPO_BPM = 120; // default tempo for quantization
  const DUR_MS: Record<VFDuration, number> = {
    w: (60_000 / TEMPO_BPM) * 4,
    h: (60_000 / TEMPO_BPM) * 2,
    q: 60_000 / TEMPO_BPM,
    8: 60_000 / TEMPO_BPM / 2,
    16: 60_000 / TEMPO_BPM / 4,
    32: 60_000 / TEMPO_BPM / 8
  } as any;
  const KEY_TO_DURATION: Record<string, VFDuration> = {
    '1': 'w',
    '2': 'h',
    '4': 'q',
    '8': '8',
    '16': '16',
    '32': '32'
  } as any;

  let containerEl: HTMLDivElement;
  let imageUrl = $state<string | undefined>(undefined);
  let currentDuration: VFDuration = 'q';
  let notes: NoteItem[] = $state([]);
  let saved: SavedScore[] = $state([]);
  let selectedId: string | null = null;
  let newName: string = 'Untitled';

  // Track active holds to quantize on release
  // key token: `${note}/${octave}`
  let activeHolds = new Map<string, number>();

  function toVFKey(note: string, octave: number): string {
    // Convert 'C#' + 4 -> 'c#/4'
    const letter = note[0].toLowerCase();
    const acc = note.length > 1 ? note.slice(1).toLowerCase() : '';
    return `${letter}${acc}/${octave}`;
  }

  function quantizeDuration(ms: number): VFDuration {
    let best: VFDuration = 'q';
    let bestErr = Infinity;
    for (const d of Object.keys(DUR_MS) as VFDuration[]) {
      const err = Math.abs(DUR_MS[d] - ms);
      if (err < bestErr) {
        bestErr = err;
        best = d;
      }
    }
    return best;
  }

  function drawStaff() {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    const renderer = new VexFlow.Renderer(containerEl, VexFlow.Renderer.Backends.SVG);
    const width = Math.max(700, 90 + notes.length * 60);
    const staveHeight = 240;
		const numPaddingSpaces = Math.floor((staveHeight - 4 * 10) / 2 / 10);
    renderer.resize(width, staveHeight);
    const stave = new VexFlow.Stave(10, 10, width - 20, {
      spacingBetweenLinesPx: 10,
      spaceAboveStaffLn: numPaddingSpaces,
      spaceBelowStaffLn: numPaddingSpaces,
      style: { lineWidth: 1 }
    });
    stave.addClef('treble');
    const ctx = renderer.getContext();
    stave.setContext(ctx).draw();

    if (notes.length === 0) return;
    const vfNotes = notes.map((n) => {
      const parts = n.key.split('/');
      const letter = parts[0].replace('bb', 'bb');
      const octave = parts[1];
      const sn = new VexFlow.StaveNote({ keys: [n.key], duration: n.duration });
      // Add accidental if present in key
      if (letter.includes('#')) sn.addModifier(new Accidental('#'));
      if (letter.includes('b') && !letter.includes('#')) sn.addModifier(new Accidental('b'));
      return sn;
    });
    VexFlow.Formatter.FormatAndDraw(ctx, stave, vfNotes);
  }

  $effect(() => {
    drawStaff();
  });

  function onImageSelected(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files || !files[0]) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      imageUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function saveCurrent() {
    const id = selectedId ?? String(Date.now());
    const notesSnap = $state.snapshot(notes) as NoteItem[];
    const entry: SavedScore = { id, name: newName || 'Untitled', imageUrl, notes: notesSnap };
    const idx = saved.findIndex((s) => s.id === id);
    if (idx >= 0) saved[idx] = entry; else saved.push(entry);
    // persist using a snapshot to avoid proxy serialization
    const savedSnap = $state.snapshot(saved) as SavedScore[];
    localStorage.setItem('transcribe:scores', JSON.stringify(savedSnap));
    selectedId = id;
  }

  function newStaff() {
    selectedId = null;
    newName = 'Untitled';
    imageUrl = undefined;
    notes = [];
    activeHolds.clear();
  }

  function removeLastNote() {
    if (notes.length > 0) {
      notes.pop();
    }
  }

  function loadSaved(id: string) {
    const s = saved.find((x) => x.id === id);
    if (!s) return;
    selectedId = s.id;
    newName = s.name;
    imageUrl = s.imageUrl;
    notes = [...s.notes];
    activeHolds.clear();
  }

  // Duration quick-keys: '1','2','4','8','16','32'
  let durBuf = '';
  let durTimer: any = null;
  function commitDurationBuffer() {
    const d = KEY_TO_DURATION[durBuf as keyof typeof KEY_TO_DURATION];
    if (d) {
      if (notes.length > 0) {
        // Change last recorded note's duration
        notes[notes.length - 1] = { ...notes[notes.length - 1], duration: d };
      } else {
        // No notes yet: set default for the first note
        currentDuration = d;
      }
    }
    durBuf = '';
    if (durTimer) { clearTimeout(durTimer); durTimer = null; }
  }
  function onKeyDown(e: KeyboardEvent) {
    const k = e.key;
    if (/^[0-9]$/.test(k)) {
      durBuf = (durBuf + k).slice(-2); // keep last two digits
      if (['1', '2', '4', '8', '16', '32'].includes(durBuf)) {
        commitDurationBuffer();
      } else {
        if (durTimer) clearTimeout(durTimer);
        durTimer = setTimeout(() => commitDurationBuffer(), 500);
      }
    }
  }

  let midi = getVirtualMidiKeyboard();

	let OldStaffProps: any;
	onDestroy(() => {
		if (OldStaffProps) MetricsDefaults.Stave.padding = OldStaffProps.Stave.padding;
	});
  onMount(() => {
		// clear the internal cache of VexFlow
		Metrics.clear();
		OldStaffProps = {
			Stave: {
				padding: MetricsDefaults.Stave.padding
			}
		};
		MetricsDefaults.Stave.padding = 30;
    // Load saved scores
    try {
      const s = localStorage.getItem('transcribe:scores');
      if (s) saved = JSON.parse(s);
    } catch {}

    midi.turnOn();
    midi.on('noteOn', (ev: any) => {
      const token = `${ev.note}/${ev.octave}`;
      const vfKey = toVFKey(ev.note, ev.octave);
      notes.push({ key: vfKey, duration: currentDuration });
      activeHolds.set(token, performance.now());
    });
    midi.on('noteOff', (ev: any) => {
      const token = `${ev.note}/${ev.octave}`;
      const start = activeHolds.get(token);
      if (start != null) {
        const held = performance.now() - start;
        const q = quantizeDuration(held);
        // Update the most recent matching note for this token
        for (let i = notes.length - 1; i >= 0; i--) {
          const [letter, oct] = notes[i].key.split('/');
          const t2 = `${letter.toUpperCase()}/${oct}`.replace('BB', 'B').replace('##', '#');
          if (t2 === token) {
            notes[i] = { ...notes[i], duration: q };
            break;
          }
        }
      }
      activeHolds.delete(token);
    });
  });

  onDestroy(() => {
    midi.turnOff();
  });
</script>

<h3>Transcribe (Lab)</h3>

<div class="transcribe">
  <div class="left">
    <div class="upload">
      <label class="btn">
        Upload Image
        <input type="file" accept="image/*" onchange={onImageSelected} hidden />
      </label>
    </div>
    {#if imageUrl}
      <img class="preview" alt="uploaded" src={imageUrl} />
    {/if}
  </div>
  <div class="right">
    <div class="toolbar">
      <label>Name <input bind:value={newName} placeholder="Untitled" /></label>
      <button class="btn" onclick={saveCurrent}>Save</button>
      <button class="btn" onclick={newStaff}>New</button>
      <button class="btn" onclick={removeLastNote} disabled={notes.length === 0}>Remove Last</button>
      <div class="dur">Duration: {currentDuration}</div>
    </div>
    <div class="staff" bind:this={containerEl}></div>
  </div>
</div>

<div class="saved">
  <div class="title">Saved Scores</div>
  <div class="list">
    {#each saved as s}
      <button class="item" aria-current={selectedId === s.id} onclick={() => loadSaved(s.id)}>
        {s.name}
      </button>
    {/each}
  </div>
</div>

<svelte:window onkeydown={onKeyDown} />

<style>
  .transcribe {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 16px;
    padding: 12px 16px;
  }
  .left {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .upload .btn {
    display: inline-block;
    padding: 6px 10px;
    background: #6b82ff;
    color: #fff;
    border-radius: 6px;
    cursor: pointer;
  }
  .preview {
    width: 100%;
    height: auto;
    border: 1px solid #eee;
    border-radius: 6px;
    object-fit: contain;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .toolbar input {
    padding: 4px 6px;
  }
  .toolbar .btn {
    padding: 6px 10px;
    background: #6b82ff;
    color: #fff;
    border-radius: 6px;
  }
  .dur {
    margin-left: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  }
  .staff {
    background: #fafafa;
    border: 1px solid #eee;
    border-radius: 6px;
    min-height: 260px;
  }
  .saved { padding: 8px 16px; }
  .saved .title { font-weight: 600; margin-bottom: 6px; }
  .saved .list { display: flex; gap: 6px; flex-wrap: wrap; }
  .saved .item[aria-current="true"] { outline: 2px solid #6b82ff; }
</style>
