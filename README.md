# Betaform — Climbing Studio

An interactive 3D bouldering gym for building walls, setting routes, and exploring climbing sequences for different body proportions.

## Run locally

Requires Python 3. No package installation or build step is needed.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8765/ and keep the terminal running. Opening `index.html` directly as a file will not work with the module-based app and its worker.

## Features

- Explore a 3D gym with multiple routes.
- Build connected wall panels and adjust their shapes and inclinations.
- Place holds and mark route starts and finishes.
- Suggest climbing sequences for a chosen height, with pose checks and dynamic-move support.
- Edit and replay climbing poses.
- Save sessions in the browser.

The beta planner is a heuristic simulation, not a guarantee of real-world feasibility or climbing safety. It can return a partial sequence when it cannot find a checked finish.

## Source layout

`dist/` contains the editable application source and is also the complete static deployment directory.

- `app.js`: scene and application integration
- `beta-planning.js`, `beta-planner-worker.js`: suggestion UI and route search
- `movement-model.js`, `dynamic-moves.js`, `climber.js`: pose fitting, movement, and avatar
- `design-tools.js`, `wall-model.js`: wall builder
- `holds.js`, `hold-editor.js`, `default-gym.js`: holds, route setting, and initial gym
- `vendor/`: Three.js and OrbitControls
- `recording-guide.html`: recording reference guide

## Hosting

Serve the contents of `dist/` with any static web server. No backend or API credentials are required. Sessions are stored locally in each browser and are not shared between localhost and a hosted site.

Third-party licensing is documented in `THIRD_PARTY_NOTICES.md`.
