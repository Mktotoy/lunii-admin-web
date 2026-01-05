import { StudioPack } from "./types";
import { getFileHandleFromPath } from "../fs";
import { uuidToRef } from "../generators";

export const getEstimatedPackDuration = async (
    luniiHandle: FileSystemDirectoryHandle,
    uuid: string
): Promise<string> => {
    try {
        const ref = uuidToRef(uuid);
        const sfHandle = await getFileHandleFromPath(luniiHandle, `.content/${ref}/sf`) as any;

        // Sum sizes of all files in sf/000
        // Heuristic: 1MB ~= 1 minute (roughly for Lunii 128kbps mono/stereo)
        let totalSize = 0;
        try {
            const sf000 = await sfHandle.getDirectoryHandle("000");
            for await (const entry of sf000.values()) {
                if (entry.kind === 'file') {
                    const file = await (entry as FileSystemFileHandle).getFile();
                    totalSize += file.size;
                }
            }
        } catch (e) {
            // Probably no sf/000 or different structure
        }

        if (totalSize === 0) return "Inconnue";

        const totalMinutes = Math.floor(totalSize / (1024 * 1024)); // very rough estimate
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;

        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    } catch (e) {
        return "Inconnue";
    }
};

export const getStudioPackDuration = (pack: StudioPack): string => {
    // Estimating for studio pack by summing nodes that have audio
    // This is placeholders until real metadata is extracted and saved in nodeIndex
    const nodesWithAudio = pack.stageNodes.filter(n => n.audio);
    const estSec = nodesWithAudio.length * 30; // 30s avg
    const totalMinutes = Math.floor(estSec / 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};
