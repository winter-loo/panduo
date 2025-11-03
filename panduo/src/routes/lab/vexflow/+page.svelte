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

  onMount(() => {
    (() => {
      let renderer = new VexFlow.Renderer(trebleStaffRef!, VexFlow.Renderer.Backends.SVG);
      renderer.resize(800, 80);
      const staff = new Stave(16, 0, 200, { spaceAboveStaffLn: 2, spaceBelowStaffLn: 2 });
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
      const staff = new Stave(16, 0, 200, { spaceAboveStaffLn: 2, spaceBelowStaffLn: 2 });
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
          spacingBetweenLinesPx: staffLineSpacing,
        },
      });
      let renderer = new VexFlow.Renderer(grandStaffRef!, VexFlow.Renderer.Backends.SVG);
      renderer.resize(800, (2 * numSpacesPerStaff - 2) * staffLineSpacing);
      let ctx = renderer.getContext();
      const treble = new Stave(
        16,
        0,
        400,
        {
          spaceAboveStaffLn: 2,
          spaceBelowStaffLn: 2,
          spacingBetweenLinesPx: staffLineSpacing,
        },
        cfg,
      );
      treble.addClef('treble');
      const bass = new Stave(
        16,
        (numSpacesPerStaff - 2) * staffLineSpacing,
        400,
        {
          spaceAboveStaffLn: 2,
          spaceBelowStaffLn: 2,
          spacingBetweenLinesPx: staffLineSpacing,
        },
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

      connector.drawWithStyle();

      const f3 = new VexFlow.StaveNote(
        {
          clef: 'bass',
          keys: ['f/3'],
          duration: '4',
          autoStem: true,
        },
        cfg,
      );
      const c4 = new VexFlow.StaveNote(
        {
          clef: 'bass',
          keys: ['c/4'],
          duration: '4',
          autoStem: true,
        },
        cfg,
      );
      const b3 = new VexFlow.StaveNote(
        {
          clef: 'treble',
          keys: ['b/3'],
          duration: '4',
          autoStem: true,
        },
        cfg,
      );
      const a3 = new VexFlow.StaveNote(
        {
          clef: 'treble',
          keys: ['a/3'],
          duration: '4',
          autoStem: true,
        },
        cfg,
      );
      const g3 = new VexFlow.StaveNote(
        {
          clef: 'treble',
          keys: ['g/3'],
          duration: '4',
          autoStem: true,
        },
        cfg,
      );
      const g3_bass = new VexFlow.StaveNote(
        {
          clef: 'bass',
          keys: ['g/3'],
          duration: '4',
          autoStem: true,
        },
        cfg,
      );
      const c4_treble = new VexFlow.StaveNote(
        {
          clef: 'treble',
          keys: ['c/4'],
          duration: '4',
          autoStem: true,
        },
        cfg,
      );
      const g4 = new VexFlow.StaveNote(
        {
          clef: 'treble',
          keys: ['g/4'],
          duration: '4',
          autoStem: true,
        },
        cfg,
      );
      VexFlow.Formatter.FormatAndDraw(
        renderer.getContext(),
        treble,
        { notes: [g4, c4_treble, g3, a3, b3] },
        {
          params: {
            autoBeam: true,
          },
        },
      );
      VexFlow.Formatter.FormatAndDraw(
        renderer.getContext(),
        bass,
        { notes: [f3, c4, g3_bass] },
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
    class="treble-staff flex items-center justify-start ring ring-[var(--app-color-400)]"
    bind:this={trebleStaffRef}
  ></div>
</section>
<section class="m-4">
  <div
    class="bass-staff flex items-center justify-start ring ring-[var(--app-color-400)]"
    bind:this={bassStaffRef}
  ></div>
</section>
<section class="m-4">
  <div
    class="grand-staff items-center justify-start ring ring-[var(--app-color-400)]"
    bind:this={grandStaffRef}
  ></div>
</section>
<section class="m-4 align-baseline">
  <!-- noteHeadWhole  -->
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(12)}px">
    &#xE10C; O (fontSize: 12 &leftarrow; {Font.convertSizeToPixelValue(12) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(15)}px">
    &#xE10C; O (fontSize: 15 &leftarrow; {Font.convertSizeToPixelValue(15) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(18)}px">
    &#xE10C; O (fontSize: 18 &leftarrow; {Font.convertSizeToPixelValue(18) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(21)}px">
    &#xE10C; O (fontSize: 21 &leftarrow; {Font.convertSizeToPixelValue(21) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(24)}px">
    &#xE10C; O (fontSize: 24 &leftarrow; {Font.convertSizeToPixelValue(24) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(27)}px">
    &#xE10C; O (fontSize: 27 &leftarrow; {Font.convertSizeToPixelValue(27) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(30)}px">
    &#xE10C; O (fontSize: 30 &leftarrow; {Font.convertSizeToPixelValue(30) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(33)}px">
    &#xE10C; O (fontSize: 33 &leftarrow; {Font.convertSizeToPixelValue(33) + 'px'})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(36)}px">
    &#xE10C; O (fontSize: 36 &leftarrow; {Font.convertSizeToPixelValue(36) + 'px'})
  </p>
</section>

<section class="m-4">
  <p style:font-size="{Font.convertSizeToPixelValue(36)}px" style:line-height="48px">
    O (fontSize: 36 &leftarrow; {Font.convertSizeToPixelValue(36) + 'px'})
  </p>
</section>
