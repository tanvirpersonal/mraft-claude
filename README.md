# MRAFT — Spacecraft Construction Simulator

MRAFT is a static, browser-based spacecraft construction and test-flight simulator for GitHub Pages.

## Current upgrade

The project now uses one authoritative builder/flight implementation in `app.js`. The older duplicate builder implementation has been removed from `index.html`.

### Builder
- Procedural spacecraft part rendering; no required image assets.
- Stack attachment nodes with proximity snapping.
- Symmetry pairs that remain mirrored while moving.
- Move, rotate, duplicate and delete.
- Live mass, propellant, thrust, TWR, delta-v, burn time, center of mass and center of thrust.
- Explicit stage assignment and stage normalization.
- Save/load using versioned localStorage blueprint data.
- Responsive desktop and mobile layouts.

### Test flight
- The same built rocket data is converted into the flight vehicle.
- 2D translational physics with Earth gravity.
- Variable thrust and fuel burn.
- Atmospheric drag below the defined atmosphere boundary.
- Attitude rotation with A/D.
- Throttle with W/S or the on-screen slider.
- Manual staging with Space.
- Stage separation for stages containing a decoupler.
- Altitude, velocity, TWR, fuel, apoapsis and periapsis readouts.
- 1× / 5× / 20× time warp.
- Ballistic trajectory preview.

## Engineering model

The core uses SI units internally:
- mass: kg
- thrust: N
- distance: m
- velocity: m/s
- time: s

The UI converts these into rocket-friendly tonnes, kN and km.

Delta-v uses the Tsiolkovsky rocket equation with stage-aware sequential mass accounting. Flight uses central-body gravity, an exponential atmosphere model and a simple drag approximation.

## Roadmap

Next high-value systems are:
1. Proper hierarchical part/stack graph.
2. Better stage separation geometry and child-stage detachment.
3. RCS and rotational inertia.
4. Maneuver nodes and patched-conic orbit map.
5. Time-warp-safe orbital integration.
6. Docking ports and persistent multi-vessel missions.
