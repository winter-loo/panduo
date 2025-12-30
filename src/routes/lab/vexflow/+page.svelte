<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Stave, StaveConnector, StaveNote, VexFlow, Font, BarlineType, type StaveNoteStruct, Metrics, MetricsDefaults, StaveModifierPosition, Barline } from "vexflow";
  import { onMount } from "svelte";

  let trebleStaffRef: HTMLDivElement | null = null;
  let bassStaffRef: HTMLDivElement | null = null;
  let grandStaffRef: HTMLDivElement | null = null;
  let horizontalStaveRef: HTMLDivElement | null = null;

  function createStaveNotes(notes: StaveNoteStruct[]): StaveNote[] {
    let sNotes = [];
    for (let i = 0; i < notes.length; i++) {
      let sNote = new VexFlow.StaveNote({ ...notes[i], autoStem: true });
      sNotes.push(sNote);
    }
    return sNotes;
  }

  let trebleStaffFontFamily = $state("Bravura");

  $effect(() => {
    let renderer = new VexFlow.Renderer(trebleStaffRef!, VexFlow.Renderer.Backends.SVG);
    renderer.resize(800, 80);
    const staff = new Stave(0, 0, 200, { spaceAboveStaffLn: 2, spaceBelowStaffLn: 2 });
    staff.addClef("treble");
    staff.setContext(renderer.getContext()).draw();
    const g4 = new VexFlow.StaveNote({
      clef: "treble",
      keys: ["g/4"],
      duration: "4",
      autoStem: true,
      alignCenter: true,
    });
    const c5 = new VexFlow.StaveNote({
      clef: "treble",
      keys: ["c/5"],
      duration: "4",
      autoStem: true,
      alignCenter: true,
    });
    VexFlow.Formatter.FormatAndDraw(renderer.getContext(), staff, [g4, c5], {
      autoBeam: true,
    });
    return () => {
      trebleStaffRef?.replaceChildren();
    };
  });

  onMount(() => {
    (() => {
      let renderer = new VexFlow.Renderer(bassStaffRef!, VexFlow.Renderer.Backends.SVG);
      renderer.resize(800, 80);
      const staff = new Stave(0, 0, 200, { spaceAboveStaffLn: 2, spaceBelowStaffLn: 2 });
      staff.addClef("bass");
      staff.setContext(renderer.getContext()).draw();
      const f3 = new VexFlow.StaveNote({
        clef: "bass",
        keys: ["f/3"],
        duration: "4",
        autoStem: true,
        alignCenter: true,
      });
      const c3 = new VexFlow.StaveNote({
        clef: "bass",
        keys: ["c/3"],
        duration: "4",
        autoStem: true,
        alignCenter: true,
      });
      VexFlow.Formatter.FormatAndDraw(renderer.getContext(), staff, [f3, c3], {
        autoBeam: true,
      });
    })();

    (() => {
      let fontSize = 48;
      let staffLineSpacing = Font.convertSizeToPixelValue(fontSize) / 4;
      let numSpacesPerStaff = 8;
      let renderer = new VexFlow.Renderer(grandStaffRef!, VexFlow.Renderer.Backends.SVG);
      let staveWidth = 1400;
      renderer.resize(staveWidth, 20 * staffLineSpacing);
      let ctx = renderer.getContext();
      const treble = new Stave(0, 0, staveWidth, {});
      treble.addClef("treble");
      const bass = new Stave(0, (numSpacesPerStaff - 2) * staffLineSpacing, staveWidth, {});
      bass.addClef("bass");
      treble.setContext(ctx);
      bass.setContext(ctx);

      const connector = new StaveConnector(treble, bass);
      connector.setType(StaveConnector.type.SINGLE);
      connector.setContext(ctx);

      treble.drawWithStyle();
      bass.drawWithStyle();

      connector.setStyle({ lineWidth: 2, fillStyle: "var(--app-color-200)" });
      connector.drawWithStyle();

      const bassNotes = createStaveNotes([
        {
          clef: "bass",
          keys: ["f/3"],
          duration: "4",
        },
        {
          clef: "bass",
          keys: ["e/3"],
          duration: "4",
        },
        {
          clef: "bass",
          keys: ["d/3"],
          duration: "4",
        },
        {
          clef: "bass",
          keys: ["c/3"],
          duration: "4",
        },
        {
          clef: "bass",
          keys: ["g/3"],
          duration: "1",
        },
        {
          clef: "bass",
          keys: ["a/3"],
          duration: "4",
        },
        {
          clef: "bass",
          keys: ["b/3"],
          duration: "4",
        },
        {
          clef: "bass",
          keys: ["c/4"],
          duration: "2",
        },
      ]);

      const trebleNotes = createStaveNotes([
        {
          keys: ["c/4"],
          duration: "4",
        },
        {
          keys: ["d/4"],
          duration: "8",
        },
        {
          keys: ["e/4"],
          duration: "8",
        },
        {
          keys: ["f/4"],
          duration: "2",
        },
        {
          keys: ["g/4"],
          duration: "16",
        },
        {
          keys: ["a/4"],
          duration: "16",
        },
        {
          keys: ["b/4"],
          duration: "8",
        },
        {
          keys: ["c/5"],
          duration: "4",
        },
        {
          keys: ["c/5"],
          duration: "2",
        },
        {
          keys: ["b/4"],
          duration: "2",
        },
        {
          keys: ["b/4"],
          duration: "2",
        },
      ]);
      VexFlow.Formatter.FormatAndDraw(renderer.getContext(), bass, bassNotes, {
        autoBeam: true,
      });
      VexFlow.Formatter.FormatAndDraw(renderer.getContext(), treble, trebleNotes, {
        autoBeam: true,
      });
    })();

    (() => {
      if (!horizontalStaveRef) return;
      let renderer = new VexFlow.Renderer(horizontalStaveRef, VexFlow.Renderer.Backends.SVG);
      renderer.resize(600, 100);
      let ctx = renderer.getContext();
      MetricsDefaults.Stave.padding = 0;
      MetricsDefaults.Stave.endPaddingMin = 0;
      MetricsDefaults.Stave.endPaddingMax = 0;
      MetricsDefaults.Stave.endPadding = 0;
      MetricsDefaults.Stave.unalignedNotePadding = 0;
      MetricsDefaults.NoteHead.minPadding = 0;
      Metrics.clear();
      const stave1 = new Stave(10, 0, 16, {
        spaceAboveStaffLn: 3,
        spaceBelowStaffLn: 3,
      }).setContext(ctx);
      stave1.setEndBarType(BarlineType.SINGLE);
      (stave1.getModifiers(StaveModifierPosition.BEGIN)[0] as unknown as Barline).setWidth(0);
      (stave1.getModifiers(StaveModifierPosition.END)[0] as unknown as Barline).setWidth(0);
      stave1.draw();
      const stave2 = new Stave(260, 0, 250, {
        spaceAboveStaffLn: 3,
        spaceBelowStaffLn: 3,
      }).setContext(ctx);
      stave2.setBegBarType(BarlineType.END);
      stave2.draw();

      let notes = createStaveNotes([
        {
          keys: ["b/4"],
          duration: "1",
        },
      ]);
      VexFlow.Formatter.FormatAndDraw(renderer.getContext(), stave1, notes, {
        autoBeam: true,
      });
      VexFlow.Formatter.FormatAndDraw(renderer.getContext(), stave2, notes, {
        autoBeam: true,
      });
    })();
  });
</script>

<section class="m-4">
  <div class="w-full">
    <Button variant="ghost" size="sm" onclick={() => (trebleStaffFontFamily = "Bravura")}>Bravura</Button>
    <Button variant="ghost" size="sm" onclick={() => (trebleStaffFontFamily = "Bravura Playful")}
      >Bravura Playful</Button
    >
  </div>
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
<section class="m-4">
  <div
    class="horizontal-stave flex items-center justify-start pl-4 ring ring-[var(--app-color-400)]"
    bind:this={horizontalStaveRef}
  ></div>
</section>
<section class="m-4 align-baseline">
  <!-- noteHeadWhole  -->
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(24)}px">
    &#xe0a3; O (fontSize: 24 &leftarrow; {Font.convertSizeToPixelValue(24) + "px"})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(30)}px">
    &#xe0a3; O (fontSize: 30 &leftarrow; {Font.convertSizeToPixelValue(30) + "px"})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(36)}px">
    &#xe0a3; O (fontSize: 36 &leftarrow; {Font.convertSizeToPixelValue(36) + "px"})
  </p>
  <p style:font-family="Bravura" style:font-size="{Font.convertSizeToPixelValue(48)}px">
    &#xe0a3; O (fontSize: 48 &leftarrow; {Font.convertSizeToPixelValue(48) + "px"})
  </p>
</section>
