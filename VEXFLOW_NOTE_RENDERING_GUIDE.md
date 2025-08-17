# VexFlow Note Rendering Code Flow Guide

This comprehensive guide provides two levels of understanding for how musical
notes are rendered on the staff in VexFlow, from high-level API usage to
detailed function-level implementation. VexFlow is a JavaScript library for
rendering music notation in web browsers, and understanding its note rendering
pipeline is crucial for developers working with musical notation.

## Table of Contents
1. [High-Level Code Flow](#high-level-code-flow)
2. [Low-Level Detailed Flow](#low-level-detailed-flow)
3. [Key Concepts](#key-concepts)
4. [Common Use Cases](#common-use-cases)

---

## High-Level Code Flow

### Overview: From API to Rendered Note

The VexFlow note rendering process follows this sophisticated pipeline that
transforms simple note descriptions into pixel-perfect musical notation:

```
User Input → Factory → EasyScore Parser → System/Voice → Formatter → TickContext → StaveNote → NoteHead → Canvas Rendering
```

This flow represents a complete transformation from human-readable musical
notation (like "C#5/q") to rendered graphics on screen. Each stage has specific
responsibilities and builds upon the previous stage's output.

### 1. API Entry Point - Factory Pattern

**Starting Point**: User creates a Factory instance

The Factory serves as the primary entry point and orchestrates the entire
rendering pipeline. It abstracts away the complexity of creating individual
components and provides a unified interface for music notation creation.

```javascript
const factory = new VexFlow.Factory({
  renderer: { elementId: 'output', width: 300, height: 180 }
});
```

**What happens during Factory creation:**
- **Renderer Detection**: Automatically detects whether to use SVG or Canvas based on the target element
- **Context Initialization**: Creates the appropriate rendering context (SVGContext or CanvasContext)
- **Resource Management**: Sets up internal arrays to track staves, voices, and render queue
- **Default Configuration**: Establishes default spacing, fonts, and rendering options

**Key Components**:
- `Factory` (`src/factory.ts`) - High-level API wrapper that provides convenient methods for creating all VexFlow objects
- `EasyScore` (`src/easyscore.ts`) - Simplified note creation syntax with string-based notation parsing
- `System` (`src/system.ts`) - Musical system container that manages multiple staves and their relationships
- `Renderer` - Handles the actual drawing operations to SVG or Canvas elements

### 2. Note Creation and Organization

**Flow**: Factory → EasyScore → StaveNote Creation

The note creation phase transforms human-readable musical notation into
structured data objects that VexFlow can process. This involves sophisticated
parsing and object creation.

```javascript
const score = factory.EasyScore();
const system = factory.System();
const notes = score.notes('C#5/q, B4, A4, G#4', { stem: 'up' });
```

**Detailed Process Breakdown**:

1. **String Parsing**: `EasyScore.notes()` uses a grammar-based parser to tokenize note strings
   - Recognizes pitch names (C, D, E, F, G, A, B)
   - Parses accidentals (#, b, n for natural)
   - Extracts octave numbers (4, 5, 6, etc.)
   - Identifies durations (q=quarter, h=half, w=whole, etc.)
   - Handles modifiers like dots and ties

2. **Object Creation**: `Builder.commitPiece()` creates `StaveNote` instances for each parsed note
   - Converts string representations to internal key properties
   - Calculates staff line positions based on clef and pitch
   - Determines stem directions and note head types
   - Applies accidentals and other modifiers

3. **Voice Organization**: Notes are grouped into `Voice` objects that represent a single melodic line
   - Voices maintain timing information and ensure rhythmic accuracy
   - Multiple voices can exist on the same staff (like piano left/right hand)
   - Each voice tracks its total duration and validates completeness

4. **System Integration**: Voices are added to a `System` for coordinated layout
   - Systems manage multiple staves that play simultaneously
   - Handle cross-staff relationships and alignment
   - Coordinate formatting across all contained voices

### 3. Layout and Formatting

**Flow**: System → Formatter → TickContext → Positioning

The formatting phase is where VexFlow's sophisticated layout algorithms come
into play. This is the most complex part of the rendering pipeline, responsible
for creating professional-quality musical spacing and alignment.

```javascript
system.format(); // Triggers the formatting pipeline
```

**Comprehensive Formatting Process**:

1. **Formatter Creation**: `System.format()` creates a `Formatter` instance with configurable options
   - Sets up softmax factors for proportional spacing
   - Configures iteration limits for layout optimization
   - Establishes global vs. local spacing preferences

2. **Voice Alignment**: `Formatter.joinVoices()` synchronizes multiple voices across time
   - Creates a unified timeline where all voices align rhythmically
   - Handles polyrhythms and complex timing relationships
   - Ensures voices with different note densities align properly

3. **Tick Context Creation**: `Formatter.createTickContexts()` groups notes by timing position
   - Calculates the least common multiple of all voice resolutions
   - Creates TickContext objects for each unique time position
   - Groups all simultaneous notes (across all voices) into single contexts

4. **Spacing Calculation**: `TickContext.preFormat()` determines space requirements
   - Measures the width of note heads, stems, flags, and modifiers
   - Calculates displacement requirements for note collisions
   - Determines minimum and maximum spacing constraints

5. **Space Distribution**: `Formatter.preFormat()` distributes horizontal space intelligently
   - Uses proportional spacing based on note durations
   - Applies softmax algorithms for natural-looking spacing
   - Handles justification to fit specified widths
   - Resolves conflicts between spacing requirements

### 4. Note Rendering Preparation

**Flow**: StaveNote → NoteHead → Positioning

This phase prepares individual notes for rendering by calculating their exact
positions and handling visual conflicts. Each note becomes a collection of
precisely positioned graphical elements.

```javascript
// Happens during formatting
staveNote.setStave(stave);
staveNote.preFormat();
```

**Detailed Preparation Steps**:

1. **Stave Assignment**: `StaveNote.setStave()` establishes the note's relationship to its staff
   - Links the note to its containing stave for coordinate calculations
   - Provides access to staff line spacing and vertical positioning
   - Sets up the rendering context for drawing operations

2. **Note Head Creation**: `StaveNote.buildNoteHeads()` creates individual note head objects
   - Generates a `NoteHead` instance for each pitch in the chord
   - Determines appropriate glyph codes based on note duration and type
   - Handles special cases like rests, grace notes, and custom symbols
   - Calculates displacement patterns for clustered notes

3. **Vertical Positioning**: `NoteHead.setStave()` calculates precise Y coordinates
   - Converts staff line numbers to pixel positions
   - Accounts for clef type and transposition
   - Handles ledger lines for notes outside the staff
   - Applies any octave shifts or clef changes

4. **Collision Resolution**: `StaveNote.calcNoteDisplacements()` handles note conflicts
   - Detects when note heads would overlap
   - Calculates horizontal displacement amounts
   - Determines which notes should be displaced left or right
   - Adjusts spacing to maintain readability while minimizing displacement

### 5. Canvas Rendering

**Flow**: System.draw() → StaveNote.draw() → NoteHead.draw()

The final phase transforms all the calculated positions and measurements into
actual visual output. This involves precise drawing operations that create the
final musical notation.

```javascript
factory.draw(); // Renders everything to canvas
```

**Comprehensive Rendering Process**:

1. **Factory Orchestration**: `Factory.draw()` coordinates the entire rendering sequence
   - Iterates through all systems, staves, and voices in proper order
   - Ensures background elements (staves, clefs) render before foreground (notes)
   - Manages the rendering context and applies global transformations
   - Handles any post-processing effects or overlays

2. **Note Component Rendering**: `StaveNote.draw()` renders all parts of each note
   - Draws stems, flags, and beams based on calculated positions
   - Renders accidentals with proper spacing and alignment
   - Handles articulations, ornaments, and other modifiers
   - Coordinates the drawing of all note heads within the chord

3. **Note Head Drawing**: `NoteHead.draw()` creates the actual note symbols
   - Selects appropriate glyphs from the music font
   - Applies scaling and positioning transformations
   - Handles filled vs. hollow note heads based on duration
   - Renders any special note head types (diamond, triangle, etc.)

4. **Context Operations**: Final drawing commands are sent to the rendering backend
   - SVG: Creates DOM elements with precise coordinates and styling
   - Canvas: Issues drawing commands for paths, fills, and strokes
   - Applies anti-aliasing and font rendering optimizations
   - Handles high-DPI displays with appropriate scaling

---

## Low-Level Detailed Flow

### Phase 1: Factory Initialization and Setup

#### Factory Constructor (`src/factory.ts:109`)
```typescript
constructor(options: FactoryOptions = {}) {
  this.setOptions(options);
  // Initializes renderer, context, and internal arrays
}
```

**Detailed Steps**:
1. `setOptions()` merges user options with defaults
2. `initRenderer()` creates SVG/Canvas rendering context
3. `reset()` initializes internal arrays for staves, voices, renderQ

#### Renderer Context Creation (`src/factory.ts:140`)
```typescript
initRenderer(): void {
  const { elementId, width, height, background } = this.options.renderer;
  this.context = Renderer.buildContext(elementId, backend, width, height, background);
}
```

### Phase 2: Note Creation and Parsing

#### EasyScore Note Parsing (`src/easyscore.ts:522`)
```typescript
notes(line: string, options: BuilderOptions = {}): StemmableNote[] {
  this.parse(line, options);
  return this.builder.getElements().notes;
}
```

**Detailed Steps**:
1. `parse()` tokenizes the note string using grammar rules
2. `Builder.commitPiece()` processes each parsed note
3. `Factory.StaveNote()` creates StaveNote instances
4. `StaveNote` constructor initializes note properties

#### StaveNote Construction (`src/stavenote.ts:384`)
```typescript
constructor(noteStruct: StaveNoteStruct) {
  super(noteStruct);
  this.calculateKeyProps();    // Calculate pitch properties
  this.buildStem();           // Create stem if needed
  this.autoStem();            // Determine stem direction
  this.buildNoteHeads();      // Create individual note heads
}
```

**Key Functions**:
- `calculateKeyProps()` - Converts keys to line positions
- `buildStem()` - Creates stem object with hide flag for rests
- `buildNoteHeads()` - Creates NoteHead objects for each pitch

### Phase 3: System Organization and Voice Management

#### System.addStave() (`src/system.ts:197`)
```typescript
addStave(params: SystemStave): Stave {
  const stave = params.stave ?? this.factory.Stave({...});
  params.voices.forEach((voice) => {
    voice.setStave(stave).getTickables().forEach((tickable) => 
      tickable.setStave(stave)
    );
  });
}
```

**Voice Setup Process**:
1. Create or use provided Stave
2. Assign voices to stave
3. Set stave reference on all tickables (notes)
4. Add voices to system's voice collection

### Phase 4: Formatting and Layout

#### System.format() (`src/system.ts:240`)
```typescript
format(): void {
  const formatter = new Formatter(optionsDetails);
  formatter.joinVoices(this.partVoices);
  formatter.format(this.partVoices, justifyWidth, this.options.formatOptions);
}
createTickContexts(voices: Voice[]): AlignmentTickContexts {
  voices.forEach((voice: Voice, voiceIndex: number): void => {
    voice.getTickables().forEach((tickable: Tickable): void => {
      const integerTicks: number = ticksUsed.numerator;
      if (!tickToContextMap[integerTicks]) {
        const newContext = new TickContext({ tickID: integerTicks });
        tickToContextMap[integerTicks] = newContext;
      }
      tickToContextMap[integerTicks].addTickable(tickable, voiceIndex);
    });
  });
}
```

**TickContext Creation Process**:
1. Calculate resolution multiplier for all voices
2. Iterate through each voice's tickables
3. Group tickables by timing (tick position)
4. Create TickContext for each unique timing
5. Add tickables to appropriate TickContext

#### TickContext.preFormat() (`src/tickcontext.ts:247`)
```typescript
preFormat(): this {
  for (let i = 0; i < this.tickables.length; ++i) {
    const tickable = this.tickables[i];
    tickable.preFormat();
    const metrics = tickable.getMetrics();
    
    // Calculate maximum widths needed
    this.leftDisplacedHeadPx = Math.max(this.leftDisplacedHeadPx, metrics.leftDisplacedHeadPx);
    this.rightDisplacedHeadPx = Math.max(this.rightDisplacedHeadPx, metrics.rightDisplacedHeadPx);
    this.notePx = Math.max(this.notePx, metrics.notePx);
    this.width = this.notePx + this.totalLeftPx + this.totalRightPx;
  }
}
```

### Phase 5: Note Positioning and Displacement

#### StaveNote.setStave() (`src/stavenote.ts:695`)
```typescript
setStave(stave: Stave): this {
  super.setStave(stave);
  const ys = this._noteHeads.map((notehead) => {
    notehead.setStave(stave);
    return notehead.getY();
  });
  this.setYs(ys);
  
  if (this.stem) {
    const { yTop, yBottom } = this.getNoteHeadBounds();
    this.stem.setYBounds(yTop, yBottom);
  }
}
```

#### NoteHead.setStave() (`src/notehead.ts:131`)
```typescript
setStave(stave: Stave): this {
  const line = this.getLine();
  this.stave = stave;
  if (this.stave) {
    this.setY(this.stave.getYForNote(line));
    this.setContext(this.stave.getContext());
  }
}
```

**Y-Position Calculation**:
- `Stave.getYForNote(line)` converts line number to pixel Y coordinate
- Takes into account staff line spacing and stave position
- Handles ledger lines for notes outside the staff

#### StaveNote.calcNoteDisplacements() (`src/stavenote.ts:884`)
```typescript
calcNoteDisplacements(): void {
  this.setLeftDisplacedHeadPx(
    this.displaced && this.stemDirection === Stem.DOWN ? this.getGlyphWidth() : 0
  );
  this.setRightDisplacedHeadPx(
    !this.hasFlag() && this.displaced && this.stemDirection === Stem.UP ? this.getGlyphWidth() : 0
  );
}
```

### Phase 6: Final Rendering to Canvas

#### StaveNote.draw() (`src/stavenote.ts` - not shown in excerpt, but follows pattern)
```typescript
draw(): void {
  const ctx = this.checkContext();
  this.setRendered();
  
  // Draw each notehead
  this._noteHeads.forEach(notehead => notehead.draw());
  
  // Draw stem if present
  if (this.stem && this.hasStem()) {
    this.stem.draw();
  }
  
  // Draw flag if present
  if (this.hasFlag()) {
    this.flag.draw();
  }
}
```

#### NoteHead.draw() (`src/notehead.ts:151`)
```typescript
draw(): void {
  const ctx = this.checkContext();
  this.setRendered();
  ctx.openGroup('notehead', this.getAttribute('id'));
  
  this.x = this.getAbsoluteX();
  this.renderText(ctx, 0, 0);  // Renders the glyph
  (this.parent as StaveNote)?.drawModifiers(this);
  
  ctx.closeGroup();
}
```

**Final Rendering Steps**:
1. `getAbsoluteX()` calculates final X position including displacements
2. `renderText()` renders the musical glyph (note head symbol)
3. `drawModifiers()` renders accidentals, dots, etc.
4. Canvas context draws the actual pixels

### Key Data Flow Summary

1. **Input**: Note string (e.g., "C#5/q, B4, A4, G#4")
2. **Parsing**: EasyScore grammar converts to note objects
3. **Organization**: Notes grouped into Voices and Systems
4. **Timing**: TickContexts group notes by rhythmic position
5. **Spacing**: Formatter calculates horizontal spacing
6. **Positioning**: Stave assigns vertical positions
7. **Displacement**: Note collision detection and resolution
8. **Rendering**: Canvas drawing of glyphs and symbols

This flow ensures that musical notation is accurately positioned and rendered
according to standard music engraving practices.

---

## Key Concepts

### TickContext
A `TickContext` represents a single moment in time where multiple notes across
different voices may occur simultaneously. It's responsible for:
- Grouping all notes that happen at the same rhythmic position
- Calculating the total space required for all simultaneous elements
- Managing horizontal displacement when notes collide
- Coordinating alignment across multiple staves

### Voice
A `Voice` represents a single melodic line or rhythmic sequence. Key characteristics:
- Contains a sequence of tickable elements (notes, rests, etc.)
- Maintains strict timing - total duration must match the specified time signature
- Can be combined with other voices on the same staff (like piano left/right hand)
- Validates rhythmic completeness during formatting

### System
A musical `System` groups multiple staves that should be played simultaneously:
- Manages cross-staff relationships and alignment
- Coordinates formatting across all contained voices
- Handles system-wide spacing and justification
- Common examples: piano grand staff, orchestral score systems

### Formatter
The `Formatter` is VexFlow's layout engine that:
- Implements sophisticated spacing algorithms based on music engraving principles
- Uses proportional spacing where longer notes get proportionally more space
- Applies "softmax" distribution for natural-looking spacing
- Handles justification to fit music within specified widths

### StaveNote vs NoteHead
- `StaveNote`: The complete note object including stem, flags, accidentals, and all note heads in a chord
- `NoteHead`: Individual pitch within a chord, responsible for a single note symbol

---

## Common Use Cases

### Simple Melody
```javascript
const factory = new VexFlow.Factory({renderer: {elementId: 'output', width: 500, height: 200}});
const score = factory.EasyScore();
const system = factory.System();

system.addStave({
  voices: [score.voice(score.notes('C4/q, D4, E4, F4'))]
});

factory.draw();
```

### Piano Score (Two Staves)
```javascript
const system = factory.System();

// Treble clef (right hand)
system.addStave({
  voices: [score.voice(score.notes('C5/q, D5, E5, F5'))]
});

// Bass clef (left hand)  
system.addStave({
  voices: [score.voice(score.notes('C3/q, D3, E3, F3'))],
  options: {clef: 'bass'}
});

factory.draw();
```

### Custom Spacing and Formatting
```javascript
const system = factory.System({
  width: 600,
  formatOptions: {
    softmaxFactor: 100,  // Tighter spacing
    globalSoftmax: true  // Apply softmax globally
  }
});

// Add voices...
system.format();  // Apply custom formatting
factory.draw();
```
