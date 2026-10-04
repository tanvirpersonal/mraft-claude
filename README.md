# MRAFT — Spacecraft Construction Simulator

A browser-based spacecraft construction and test-flight simulator for GitHub Pages.

## Current functional loop

1. Open the builder.
2. Choose fuel tanks, engines, structure and payload parts.
3. Place parts into the workspace with attachment-node snapping.
4. Select, drag and rotate parts.
5. Shift-click while placing a part to create a mirrored symmetry pair.
6. Inspect total mass, propellant, thrust, TWR, delta-v and center of mass.
7. Assign parts to staging with the selected-part stage control.
8. Save and reload the rocket through browser localStorage.
9. Press **TEST LAUNCH**.
10. Fly the constructed rocket using the same part/stage data used by the builder.
11. Press **STAGE** or Space to advance configured stages; decouplers separate the lower stack.

## Development priority

```text
FOUNDATION
  ↓
PART DATA
  ↓
BUILDER CANVAS
  ↓
ATTACHMENT
  ↓
SELECTION
  ↓
TRANSFORM
  ↓
SYMMETRY
  ↓
STAGING
  ↓
PHYSICS CALCULATIONS
  ↓
SAVE/LOAD
  ↓
TEST LAUNCH
  ↓
ADVANCED FEATURES
  ↓
POLISH
```

The project intentionally keeps the core implementation dependency-free: HTML, CSS and JavaScript with Canvas 2D. This makes it directly deployable as a static GitHub Pages application and leaves room to evolve the flight model and visual renderer without replacing the construction data model.
