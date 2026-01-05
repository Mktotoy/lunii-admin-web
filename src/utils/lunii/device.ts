export interface DeviceInfo {
    firmwareMajor: number;
    firmwareMinor: number;
    serialNumber: string | null;
    uuid: string | null;
}

export async function getDeviceInfo(handle: FileSystemDirectoryHandle): Promise<DeviceInfo> {
    try {
        const mdHandle = await handle.getFileHandle(".md");
        const file = await mdHandle.getFile();
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);

        const version = view.getUint16(0, true);

        if (version >= 1 && version <= 3) {
            const major = view.getUint16(6, true);
            const minor = view.getUint16(8, true);

            // Serial Number (big endian long at offset 10-17)
            const snHigh = view.getUint32(10, false);
            const snLow = view.getUint32(14, false);
            const sn = (BigInt(snHigh) << 32n) | BigInt(snLow);

            let serialNumber = null;
            if (sn !== 0n && sn !== BigInt("0xFFFFFFFFFFFFFFFF") && sn !== BigInt("0xFFFF000000000000")) {
                serialNumber = sn.toString().padStart(14, '0');
            }

            // UUID at offset 256 (256 bytes)
            const uuidBytes = new Uint8Array(buffer.slice(256, 256 + 64)); // Just take first 64 for display?
            const uuid = Array.from(uuidBytes).map(b => b.toString(16).padStart(2, '0')).join('');

            return { firmwareMajor: major, firmwareMinor: minor, serialNumber, uuid };
        } else if (version >= 6 && version <= 7) {
            const textDecoder = new TextDecoder();
            const majorStr = textDecoder.decode(buffer.slice(2, 3));
            const minorStr = textDecoder.decode(buffer.slice(4, 5));
            const snBytes = buffer.slice(26, 50);
            const serialNumber = textDecoder.decode(snBytes).trim();

            return {
                firmwareMajor: parseInt(majorStr),
                firmwareMinor: parseInt(minorStr),
                serialNumber,
                uuid: null
            };
        }

        throw new Error("Version de métadonnées non supportée: " + version);
    } catch (e) {
        console.error("Erreur lors de la lecture des infos de l'appareil", e);
        throw e;
    }
}
