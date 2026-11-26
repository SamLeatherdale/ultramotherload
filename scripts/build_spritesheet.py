#!/usr/bin/env python3
"""Build Ultra Motherload's WebP tile spritesheet, JSON manifest, and WebP facility images
from a local Super Motherload installation directory.

Expected files inside <game_dir>:
    assets/GL/tiles/tile.ags.phyre
    assets/GL/facilities/{alpha,beta,delta,gamma,boss,space,surface}.ags.phyre
"""

from __future__ import annotations

import argparse
import json
import math
import struct
from pathlib import Path
from PIL import Image, ImageDraw

# Game atlas tile decimal IDs -> 2-digit uppercase hex map code.
# Quest items (5B, 69, 6A, 6B) use the unlocked 8xx sprites rather than the locked 0xx/1xx cubes.
CORE_TILE_IDS: dict[int, str] = {
    16: "10",   # Dirt (+ extra f0001..f0004 variations)
    17: "11",   # Dirt (edge)
    18: "12",   # Dirt (edge B)
    25: "19",   # Rock
    26: "1A",   # Metal Plate
    27: "1B",   # Molten Plate
    28: "1C",   # Magma
    29: "1D",   # Bedrock
    35: "23",   # Fuel
    36: "24",   # Repair
    37: "25",   # Speed Boost (unused)
    38: "26",   # TNT
    39: "27",   # C4
    40: "28",   # Shaft Bomb
    41: "29",   # T Bomb
    80: "50",   # Ironium
    81: "51",   # Bronzium
    82: "52",   # Silverium
    83: "53",   # Goldium
    84: "54",   # Platinium
    85: "55",   # Explodium
    86: "56",   # Emerald
    87: "57",   # Ruby
    88: "58",   # Diamond
    89: "59",   # Amazonite
    90: "5A",   # Electronium
    859: "5B",  # Unobtainium (unlocked)
    100: "64",  # Mutant Skull
    101: "65",  # Arm Bones
    102: "66",  # Rib Bones
    103: "67",  # Hip Bones
    104: "68",  # Leg Bones
    873: "69",  # Hammer (unlocked)
    874: "6A",  # Scrap Metal / Sickle (unlocked)
    875: "6B",  # Broken Beacon / Sputnik (unlocked)
    # Unused blueprint tile 0x2A has no 042_* sprite in tile.ags.phyre;
    # use unused special blueprint sprite 108 (rubber_coating) for editor preview.
    108: "2A",
}

NATIVE_TILE_SIZE = 100
ATLAS_WIDTH = 4096
ATLAS_HEIGHT = 2048
ATLAS_ENTRIES = 661
ATLAS_NAMES_OFFSET = 0x4064
ATLAS_UV_OFFSET = 0xCC0


def parse_tile_atlas(atlas_path: Path) -> tuple[Image.Image, list[tuple[str, tuple[int, int, int, int]]]]:
    data = atlas_path.read_bytes()
    names: list[str] = []
    pos = ATLAS_NAMES_OFFSET
    while len(names) < ATLAS_ENTRIES and pos < 0x80F0:
        if data[pos] == 0:
            pos += 1
            continue
        end = data.find(b"\x00", pos)
        names.append(data[pos:end].decode("ascii"))
        pos = end + 1

    if len(names) != ATLAS_ENTRIES:
        raise RuntimeError(f"Expected {ATLAS_ENTRIES} atlas entries, found {len(names)}")

    tex_offset = len(data) - ATLAS_WIDTH * ATLAS_HEIGHT * 4
    atlas = Image.frombytes("RGBA", (ATLAS_WIDTH, ATLAS_HEIGHT), data[tex_offset:])

    entries: list[tuple[str, tuple[int, int, int, int]]] = []
    for idx, name in enumerate(names):
        _, u, v, uw, vh = struct.unpack_from("<I4f", data, ATLAS_UV_OFFSET + idx * 20)
        x = round(u * ATLAS_WIDTH)
        y = round(v * ATLAS_HEIGHT)
        w = round(uw * ATLAS_WIDTH)
        h = round(vh * ATLAS_HEIGHT)
        entries.append((name, (x, y, x + w, y + h)))

    return atlas, entries


def load_facility_atlas_bgra(path: Path) -> Image.Image:
    """Load an uncompressed ARGB8 (little-endian BGRA) PhyreEngine facility atlas upright."""
    data = path.read_bytes()
    idx_argb = data.find(b"ARGB8")
    if idx_argb == -1:
        raise RuntimeError(f"Could not find ARGB8 header in {path}")
    w = h = None
    for off in range(max(0, idx_argb - 64), idx_argb, 4):
        v1, v2 = struct.unpack_from("<II", data, off)
        if v1 in (512, 1024, 2048, 4096) and v2 in (512, 1024, 2048, 4096) and v1 * v2 * 4 < len(data):
            w, h = v1, v2
            break
    if w is None or h is None:
        raise RuntimeError(f"Could not determine texture dimensions in {path}")
    tex_offset = len(data) - w * h * 4
    raw = Image.frombytes("RGBA", (w, h), data[tex_offset:])
    b, g, r, a = raw.split()
    return Image.merge("RGBA", (r, g, b, a)).transpose(Image.FLIP_TOP_BOTTOM)


def make_sky_tile(size: int) -> Image.Image:
    im = Image.new("RGB", (size, size), (4, 6, 10))
    draw = ImageDraw.Draw(im)
    stars = [
        (0.14, 0.28, 125),
        (0.32, 0.16, 85),
        (0.64, 0.26, 145),
        (0.74, 0.10, 105),
        (0.46, 0.68, 135),
        (0.38, 0.90, 95),
        (0.84, 0.62, 70),
        (0.06, 0.42, 110),
    ]
    r = max(1, round(size / 45))
    for fx, fy, brightness in stars:
        cx, cy = int(fx * size), int(fy * size)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(brightness, brightness, brightness + 10))
    return im


def make_invisible_tile(size: int) -> Image.Image:
    hi = size * 4
    im = make_sky_tile(size).resize((hi, hi), Image.Resampling.BILINEAR)
    draw = ImageDraw.Draw(im)
    pad = round(hi * 0.12)
    ring_w = max(4, round(hi * 0.13))
    red = (232, 88, 76)
    draw.ellipse((pad, pad, hi - pad, hi - pad), outline=red, width=ring_w)
    off = round(hi * 0.24)
    draw.line((off, off, hi - off, hi - off), fill=red, width=ring_w)
    return im.resize((size, size), Image.Resampling.LANCZOS)


def make_marker_tile(size: int) -> Image.Image:
    return Image.new("RGB", (size, size), (110, 115, 104))


def build_tiles(atlas_path: Path, out_webp: Path, out_manifest: Path, tile_size: int, quality: int) -> None:
    atlas, entries = parse_tile_atlas(atlas_path)
    grouped: dict[str, list[tuple[int, Image.Image]]] = {}

    for name, box in entries:
        parts = name.removesuffix(".png").split("_")
        tid = int(parts[0])
        frame = int(parts[1][1:])
        color = int(parts[2][1:])

        key: str | None = None
        if tid in CORE_TILE_IDS:
            if tid == 16 or frame == 0:
                key = f"{CORE_TILE_IDS[tid]}0{color}"
        elif tid == 1:
            key = f"T001_{color}"
        elif 257 <= tid <= 302:
            key = f"T{tid}_{color}"
        elif 384 <= tid <= 396:
            key = f"E{tid}_{color}"

        if key is None:
            continue

        crop = atlas.crop(box).transpose(Image.FLIP_TOP_BOTTOM).convert("RGB")
        if tile_size != crop.width:
            crop = crop.resize((tile_size, tile_size), Image.Resampling.LANCZOS)
        grouped.setdefault(key, []).append((frame, crop))

    grouped["FF"] = [(0, make_sky_tile(tile_size))]
    grouped["FE"] = [(0, make_invisible_tile(tile_size))]
    grouped["FD"] = [(0, make_marker_tile(tile_size))]

    ordered_keys = sorted(grouped.keys())
    flat_tiles: list[Image.Image] = []
    manifest_tiles: dict[str, list[int]] = {}

    for key in ordered_keys:
        frames = sorted(grouped[key], key=lambda item: item[0])
        indices: list[int] = []
        for _, tile_img in frames:
            indices.append(len(flat_tiles))
            flat_tiles.append(tile_img)
        manifest_tiles[key] = indices

    manifest_tiles["01"] = [manifest_tiles["T001_0"][0]]
    manifest_tiles["02"] = [manifest_tiles["E384_0"][0]]

    total = len(flat_tiles)
    cols = math.ceil(math.sqrt(total))
    rows = math.ceil(total / cols)
    sheet = Image.new("RGB", (cols * tile_size, rows * tile_size), (0, 0, 0))
    for idx, tile_img in enumerate(flat_tiles):
        sheet.paste(tile_img, ((idx % cols) * tile_size, (idx // cols) * tile_size))

    out_webp.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_webp, "WEBP", quality=quality, method=6)

    manifest = {
        "tileSize": tile_size,
        "cols": cols,
        "rows": rows,
        "tiles": manifest_tiles,
    }
    out_manifest.parent.mkdir(parents=True, exist_ok=True)
    out_manifest.write_text(json.dumps(manifest, separators=(",", ":")) + "\n", encoding="utf-8")

    print(
        f"Built {out_webp} ({cols*tile_size}x{rows*tile_size}, {total} tiles, "
        f"{out_webp.stat().st_size / 1024:.1f} KB) and {out_manifest} ({len(manifest_tiles)} keys)"
    )


def build_facilities(facilities_dir: Path, out_res_dir: Path, tile_size: int, quality: int) -> None:
    scale = tile_size / NATIVE_TILE_SIZE

    def save_facility(name: str, img: Image.Image, has_alpha: bool = False) -> None:
        tw = round(img.width * scale)
        th = round(img.height * scale)
        resized = img.resize((tw, th), Image.Resampling.LANCZOS)
        if not has_alpha:
            resized = resized.convert("RGB")
        out_path = out_res_dir / f"{name}.webp"
        resized.save(out_path, "WEBP", quality=quality, method=6)
        print(f"Built {out_path} ({tw}x{th}, {out_path.stat().st_size / 1024:.1f} KB)")

    # Subterranean outposts Alpha, Beta, Delta: two 1800x400 halves (36x4 tiles) with transparent top corners
    for name in ("Alpha", "Beta", "Delta"):
        atlas = load_facility_atlas_bgra(facilities_dir / f"{name.lower()}.ags.phyre")
        left = atlas.crop((0, 624, 1800, 1024))
        right = atlas.crop((0, 224, 1800, 624))
        combined = Image.new("RGBA", (3600, 400), (0, 0, 0, 0))
        combined.paste(left, (0, 0))
        combined.paste(right, (1800, 0))
        save_facility(name, combined, has_alpha=True)

    # Gamma: single 800x500 sprite (8x5 tiles)
    gamma_atlas = load_facility_atlas_bgra(facilities_dir / "gamma.ags.phyre")
    gamma = gamma_atlas.crop((0, 12, 800, 512))
    save_facility("Gamma", gamma, has_alpha=False)

    # BossRoom: two 1500x600 halves (30x6 tiles)
    boss_atlas = load_facility_atlas_bgra(facilities_dir / "boss.ags.phyre")
    boss_left = boss_atlas.crop((0, 1448, 1500, 2048))
    boss_right = boss_atlas.crop((0, 848, 1500, 1448))
    boss = Image.new("RGBA", (3000, 600))
    boss.paste(boss_left, (0, 0))
    boss.paste(boss_right, (1500, 0))
    save_facility("BossRoom", boss, has_alpha=False)

    # Surface: two 1800x900 halves (36x9 tiles, rows 292..300) + the 4 surface stations composited
    surface_atlas = load_facility_atlas_bgra(facilities_dir / "surface.ags.phyre")
    surf_left = surface_atlas.crop((0, 1148, 1800, 2048))
    surf_right = surface_atlas.crop((0, 248, 1800, 1148))
    surface = Image.new("RGBA", (3600, 900))
    surface.paste(surf_left, (0, 0))
    surface.paste(surf_right, (1800, 0))
    stations = [
        ((1800, 1571, 2403, 2048), (174, 396)),   # Fuel station
        ((2403, 1537, 3086, 2048), (978, 357)),   # Mineral refinery
        ((2403, 987, 3039, 1537), (2013, 147)),   # Floating repair ship
        ((3086, 1698, 3818, 2048), (2766, 507)),  # Upgrade shop
    ]
    for box, pos in stations:
        station = surface_atlas.crop(box)
        surface.alpha_composite(station, pos)
    save_facility("Surface", surface, has_alpha=False)

    # Space sky & atmosphere transition layers (tiled above Surface row 292)
    space_atlas = load_facility_atlas_bgra(facilities_dir / "space.ags.phyre")
    space_section = space_atlas.crop((0, 724, 1200, 1024))     # 12x3 tiles (rows 0..285)
    space_transition = space_atlas.crop((0, 124, 600, 724))    # 6x6 tiles (rows 286..291)
    save_facility("SpaceSection", space_section, has_alpha=False)
    save_facility("SpaceTransition", space_transition, has_alpha=False)


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "game_dir",
        type=Path,
        help="Path to the Super Motherload installation root directory (containing assets/)",
    )
    parser.add_argument("--tile-size", type=int, default=60, help="Output tile size in pixels (default: 60)")
    parser.add_argument("--quality", type=int, default=85, help="WebP quality 0-100 (default: 85)")
    parser.add_argument("--out-res-dir", type=Path, default=repo_root / "res")
    parser.add_argument("--out-manifest", type=Path, default=repo_root / "js" / "tiles_manifest.json")
    args = parser.parse_args()

    tile_atlas = args.game_dir / "assets" / "GL" / "tiles" / "tile.ags.phyre"
    facilities_dir = args.game_dir / "assets" / "GL" / "facilities"
    if not tile_atlas.is_file():
        parser.error(f"Tile atlas not found at {tile_atlas}")
    if not facilities_dir.is_dir():
        parser.error(f"Facilities directory not found at {facilities_dir}")

    build_tiles(tile_atlas, args.out_res_dir / "tiles.webp", args.out_manifest, args.tile_size, args.quality)
    build_facilities(facilities_dir, args.out_res_dir, args.tile_size, args.quality)


if __name__ == "__main__":
    main()
