# Ripple RPG presentation v1.3

Use the supplied snow and cloud UI family across the player route. The HUD frame holds Lofi’s portrait and current status. The blue primary button denotes an available action, cream secondary buttons denote other tabs, and the slot frame holds a real item icon with its quantity. Keep the world visible behind the field journal. Show item details on selection. Keep quests on their own tab. Preserve a clear movement area between the portrait, objective and thumb controls.

The fixed cinematic shot precedes adaptive camera framing, ambient animation and HUD reveal. Lofi’s presentation follows accepted cardinal commands. Walking plays at 10 frames per second during a 145 ms step. The next idle pose retains the direction of travel. Grove inhabitants use authored destinations and fixture walkability. Use live actor positions for approach checks and suspend patrols while the journal or dialogue has focus. Action artwork and audio follow accepted gameplay results.

See animation-coverage.json for decoded frame hashes and missing authored sequences. Existing mirrored animal facings, interpolated movement and procedural gestures are transitional art. They still need species-specific stride, feeding and activity frames.

## Run and inspect

From the repository root run pnpm dev:offline. Choose New Game and skip or watch the film. Press E to talk with Aurora. Walk two tiles east and interact with the board. Choose Komodo Grove to visit the village or Operation Komodo to start a scored expedition. In Grove, I opens the bag and Escape opens pause. Touch controls appear on coarse pointers.

For browser QA, build with pnpm build, serve apps/web/dist on loopback port 4186, and run node tools/qa-rpg.mjs after. Set RIPPLE_URL or CHROME_PATH to override the server or browser. Screenshots are stored under docs/qa/rpg.

### Implemented Grove presentation
The backpack map previews a walk to the market, dock, plots, pump, camp or board. The seven villagers and Biscuit use four-frame lateral strides. The left stride mirrors the right. North/south gait and work-cycle art remain listed in the animation coverage file. Walking uses the same held-key cadence in Haven and Grove.

### Eastbank
In the optional social hub the nursery can be visited before accepting its water survey. The route from Market Lane is always open. A correct distribution of six water measures changes the beds and completes the local survey. The Grove journal provides walking routes to the buildings and tracks this restoration.

### Community task board
At the original Haven board approach, E or Act opens a task list. A square at the left and a struck-through title mark completed tasks. Expedition extraction returns the player to Haven with a temporary completion ribbon. Completed expeditions can be replayed from the board. Grove activities display the ribbon in place. After the opening hands over control, the highland road is accessible by stepping south of the spawn and going east.
