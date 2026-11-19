"""Pixel regression for the Opening Kit handoff composition and decoded video frame."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps/web/public/assets"
assert (PUBLIC / "cinematic/ripple_opening.mp4").stat().st_size > 0
fixture = json.loads((ROOT / "fixtures/himalayan-haven-intro.json").read_text())
runtime = json.loads((PUBLIC / "cinematic/haven-scene.json").read_text())
assert fixture == runtime, "Runtime Haven scene differs from the fixture"

viewport = fixture["viewport"]
assert (viewport["width"], viewport["height"], viewport["cameraX"], viewport["cameraY"]) == (640, 360, 0, 12)
background = Image.open(PUBLIC / "cinematic/haven_background.png").convert("RGBA")
assert background.size == (fixture["width"] * fixture["tileSize"], fixture["height"] * fixture["tileSize"])

def composite_actor(section: str):
    actor = fixture[section]
    sprite = Image.open(PUBLIC / f"sprites/{actor['texture']}.png").convert("RGBA")
    x = round(actor["position"][0] - sprite.width * actor["origin"][0])
    y = round(actor["position"][1] - sprite.height * actor["origin"][1])
    background.alpha_composite(sprite, (x, y))

composite_actor("spawn")
composite_actor("aurora")
x, y = viewport["cameraX"], viewport["cameraY"]
actual = background.crop((x, y, x + viewport["width"], y + viewport["height"]))
actual = actual.convert("RGB").resize((1280, 720), Image.Resampling.NEAREST)
reference = Image.open(PUBLIC / "cinematic/opening_last_frame.png").convert("RGB")
assert reference.size == actual.size
mae = sum(ImageStat.Stat(ImageChops.difference(actual, reference)).mean) / 3
assert mae <= 0.5, f"Scene composition differs from opening_last_frame.png: MAE {mae:.3f}"
print(f"PASS scene composition vs opening_last_frame.png: RGB MAE {mae:.6f}/255")

if len(sys.argv) > 1:
    decoded = Image.open(sys.argv[1]).convert("RGB")
    assert decoded.size == reference.size
    video_mae = sum(ImageStat.Stat(ImageChops.difference(decoded, reference)).mean) / 3
    assert video_mae <= 3.0, f"Decoded video end differs from reference: MAE {video_mae:.3f}"
    print(f"PASS decoded video end vs opening_last_frame.png: RGB MAE {video_mae:.6f}/255")
