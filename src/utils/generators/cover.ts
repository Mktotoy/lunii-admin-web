export const generatePlaceholderCover = (title: string, artist: string): Promise<Blob> => {
    const canvas = new OffscreenCanvas(320, 240);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get context");

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 320, 240);
    gradient.addColorStop(0, "#228be6");
    gradient.addColorStop(1, "#15aabf");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 320, 240);

    // Text configuration
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw Title
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(title || "Album", 160, 100, 300);

    // Draw Artist
    ctx.font = "18px sans-serif";
    ctx.fillText(artist || "Inconnu", 160, 140, 300);

    // Draw a small icon-like circle
    ctx.beginPath();
    ctx.arc(160, 180, 20, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    return canvas.convertToBlob({ type: "image/png" });
};
