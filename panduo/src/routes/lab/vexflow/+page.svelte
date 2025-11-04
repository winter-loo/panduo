<script lang="ts">
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
  } from '$lib/vexflow/vexflow-core';
  import { onMount } from 'svelte';

  let trebleStaffRef: HTMLDivElement | null = null;
  let bassStaffRef: HTMLDivElement | null = null;
  let grandStaffRef: HTMLDivElement | null = null;

  function createStaveNotes(notes: StaveNoteStruct[], cfg?: VexflowConfigInstance): StaveNote[] {
    let sNotes = [];
    for (let i = 0; i < notes.length; i++) {
      let sNote = new VexFlow.StaveNote({ ...notes[i], autoStem: true }, cfg);
      sNotes.push(sNote);
    }
    return sNotes;
  }

  onMount(() => {
    (() => {
      let renderer = new VexFlow.Renderer(trebleStaffRef!, VexFlow.Renderer.Backends.SVG);
      renderer.resize(800, 80);
      const staff = new Stave(0, 0, 200, { spaceAboveStaffLn: 2, spaceBelowStaffLn: 2 });
      staff.addClef('treble');
      staff.setContext(renderer.getContext()).draw();
      const g4 = new VexFlow.StaveNote({
        clef: 'treble',
        keys: ['g/4'],
        duration: '4',
        autoStem: true,
        alignCenter: true,
      });
      const c5 = new VexFlow.StaveNote({
        clef: 'treble',
        keys: ['c/5'],
        duration: '4',
        autoStem: true,
        alignCenter: true,
      });
      VexFlow.Formatter.FormatAndDraw(
        renderer.getContext(),
        staff,
        { notes: [g4, c5] },
        {
          params: {
            autoBeam: true,
          },
        },
      );
    })();

    (() => {
      let renderer = new VexFlow.Renderer(bassStaffRef!, VexFlow.Renderer.Backends.SVG);
      renderer.resize(800, 80);
      const staff = new Stave(0, 0, 200, { spaceAboveStaffLn: 2, spaceBelowStaffLn: 2 });
      staff.addClef('bass');
      staff.setContext(renderer.getContext()).draw();
      const f3 = new VexFlow.StaveNote({
        clef: 'bass',
        keys: ['f/3'],
        duration: '4',
        autoStem: true,
        alignCenter: true,
      });
      const c3 = new VexFlow.StaveNote({
        clef: 'bass',
        keys: ['c/3'],
        duration: '4',
        autoStem: true,
        alignCenter: true,
      });
      VexFlow.Formatter.FormatAndDraw(
        renderer.getContext(),
        staff,
        { notes: [f3, c3] },
        {
          params: {
            autoBeam: true,
          },
        },
      );
    })();

    (() => {
      let fontSize = 48;
      let staffLineSpacing = Font.convertSizeToPixelValue(fontSize) / 4;
      let numSpacesPerStaff = 8;
      let cfg = VexflowConfig.create({
        fontSize,
        Stave: {
          spaceAboveStaffLn: 2,
          spaceBelowStaffLn: 2,
          spacingBetweenLinesPx: staffLineSpacing,
          style: {
            lineWidth: 2,
            backgroundColor: 'var(--app-color-200)',
          },
        },
        Stem: {
          width: 2,
        },
      });
      let renderer = new VexFlow.Renderer(grandStaffRef!, VexFlow.Renderer.Backends.SVG);
      let staveWidth = 1400;
      renderer.resize(staveWidth + (cfg.get('Stave.style.lineWidth') ?? 0), 20 * staffLineSpacing);
      let ctx = renderer.getContext();
      const treble = new Stave(
        0,
        0,
        staveWidth,
        {},
        cfg,
      );
      treble.addClef('treble');
      const bass = new Stave(
        0,
        (numSpacesPerStaff - 2) * staffLineSpacing,
        staveWidth,
        {},
        cfg,
      );
      bass.addClef('bass');
      treble.setContext(ctx);
      bass.setContext(ctx);

      const connector = new StaveConnector(treble, bass);
      connector.setType(StaveConnector.type.SINGLE);
      connector.setContext(ctx);

      treble.drawWithStyle();
      bass.drawWithStyle();

      connector.setStyle({ lineWidth: 2, fillStyle: 'var(--app-color-200)' });
      connector.drawWithStyle();

      const bassNotes = createStaveNotes(
        [
          {
            clef: 'bass',
            keys: ['f/3'],
            duration: '4',
          },
          {
            clef: 'bass',
            keys: ['e/3'],
            duration: '4',
          },
          {
            clef: 'bass',
            keys: ['d/3'],
            duration: '4',
          },
          {
            clef: 'bass',
            keys: ['c/3'],
            duration: '4',
          },
          {
            clef: 'bass',
            keys: ['g/3'],
            duration: '1',
          },
          {
            clef: 'bass',
            keys: ['a/3'],
            duration: '4',
          },
          {
            clef: 'bass',
            keys: ['b/3'],
            duration: '4',
          },
          {
            clef: 'bass',
            keys: ['c/4'],
            duration: '2',
          },
        ],
        cfg,
      );

      const trebleNotes = createStaveNotes(
        [
          {
            keys: ['c/4'],
            duration: '4',
          },
          {
            keys: ['d/4'],
            duration: '8',
          },
          {
            keys: ['e/4'],
            duration: '8',
          },
          {
            keys: ['f/4'],
            duration: '2',
          },
          {
            keys: ['g/4'],
            duration: '16',
          },
          {
            keys: ['a/4'],
            duration: '16',
          },
          {
            keys: ['b/4'],
            duration: '8',
          },
          {
            keys: ['c/5'],
            duration: '4',
          },
          {
            keys: ['c/5'],
            duration: '2',
          },
          {
            keys: ['b/4'],
            duration: '2',
          },
          {
            keys: ['b/4'],
            duration: '2',
          },
        ],
        cfg,
      );
      VexFlow.Formatter.FormatAndDraw(
        renderer.getContext(),
        bass,
        { notes: bassNotes },
        {
          params: {
            autoBeam: true,
          },
        },
      );
      VexFlow.Formatter.FormatAndDraw(
        renderer.getContext(),
        treble,
        { notes: trebleNotes },
        {
          params: {
            autoBeam: true,
          },
        },
      );
    })();
  });
</script>

<section class="m-4">
  <div
    class="treble-staff flex items-center justify-start pl-4 ring ring-[var(--app-color-400)]"
    bind:this={trebleStaffRef}
  ></div>
</section>
<section class="m-4">
  <div
    class="bass-staff flex items-center justify-start pl-4 ring ring-[var(--app-color-400)]"
    bind:this={bassStaffRef}
  ></div>
</section>
<section class="m-4">
  <div
    class="grand-staff items-center justify-start pl-4 ring ring-[var(--app-color-400)]"
    bind:this={grandStaffRef}
  ></div>
</section>
<section class="m-4 align-baseline">
  <!-- noteHeadWhole  -->
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(24)}px">
    &#xe0a3; O (fontSize: 24 &leftarrow; {Font.convertSizeToPixelValue(24) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(30)}px">
    &#xe0a3; O (fontSize: 30 &leftarrow; {Font.convertSizeToPixelValue(30) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(36)}px">
    &#xe0a3; O (fontSize: 36 &leftarrow; {Font.convertSizeToPixelValue(36) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(48)}px">
    &#xe0a3; O (fontSize: 48 &leftarrow; {Font.convertSizeToPixelValue(48) + 'px'})
  </p>
</section>
