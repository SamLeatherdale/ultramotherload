const imageModules = import.meta.glob("../res/*.{jpg,png}", {
    eager: true,
    import: "default",
}) as Record<string, string>;

export const imageAssets: Record<string, string> = Object.fromEntries(
    Object.entries(imageModules).map(([filePath, url]) => {
        const filename = filePath.split("/").pop() ?? filePath;
        const name = filename.split(".")[0];
        return [name, url];
    }),
);
