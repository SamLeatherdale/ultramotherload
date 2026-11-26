import { describe, expect, it } from "vite-plus/test";
import { TOP_TUNNEL_MASK_TO_ID, TUNNEL_MASK_TO_ID, getMaterialIconKey } from "../js/autotile";
import * as globals from "../js/globals";
import { imageAssets, tileManifest } from "../js/images";

describe("imageAssets and tileManifest", () => {
    it("has valid spritesheet entries for all materials and tunnel autotiles", () => {
        for (const code of Object.keys(globals.materials)) {
            const key = getMaterialIconKey(code);
            expect(
                tileManifest.tiles[key],
                `missing icon sprite for ${code} (${key})`,
            ).toBeDefined();
        }
        for (const id of Object.values(TUNNEL_MASK_TO_ID)) {
            for (let biome = 0; biome < 4; biome++) {
                const key = `T${String(id).padStart(3, "0")}_${biome}`;
                expect(tileManifest.tiles[key], `missing tunnel sprite ${key}`).toBeDefined();
            }
        }
        for (const id of Object.values(TOP_TUNNEL_MASK_TO_ID)) {
            for (let biome = 0; biome < 4; biome++) {
                const key = `E${id}_${biome}`;
                expect(tileManifest.tiles[key], `missing top tunnel sprite ${key}`).toBeDefined();
            }
        }
        for (const outpost of globals.OUTPOSTS) {
            if (outpost.name !== "") {
                expect(
                    imageAssets[outpost.name],
                    `missing outpost image ${outpost.name}`,
                ).toBeDefined();
            }
        }
        expect(imageAssets.SpaceSection, "missing SpaceSection image").toBeDefined();
        expect(imageAssets.SpaceTransition, "missing SpaceTransition image").toBeDefined();
    });
});
