import tilesSheetUrl from "../res/tiles.webp";
import rawTileManifest from "./tiles_manifest.json";

export interface TileManifest {
    tileSize: number;
    cols: number;
    rows: number;
    tiles: Record<string, number[]>;
}

export const tileManifest: TileManifest = rawTileManifest;
export const TILE_SHEET_KEY = "TileSheet";
export { tilesSheetUrl };

const facilityModules = import.meta.glob("../res/*.webp", {
    eager: true,
    import: "default",
}) as Record<string, string>;

export const imageAssets: Record<string, string> = {
    [TILE_SHEET_KEY]: tilesSheetUrl,
    ...Object.fromEntries(
        Object.entries(facilityModules)
            .filter(([filePath]) => !filePath.endsWith("/tiles.webp"))
            .map(([filePath, url]) => {
                const filename = filePath.split("/").pop() ?? filePath;
                const name = filename.split(".")[0];
                return [name, url];
            }),
    ),
};
