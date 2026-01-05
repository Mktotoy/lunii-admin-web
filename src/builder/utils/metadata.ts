import * as mm from "music-metadata-browser";

export interface AudioMetadata {
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
    picture?: string; // base64 or object URL
    sampleRate?: number;
    numberOfChannels?: number;
}

export async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
    try {
        const metadata = await mm.parseBlob(file);
        let picture: string | undefined;

        if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            const blob = new Blob([pic.data as any], { type: pic.format });
            picture = URL.createObjectURL(blob);
        }

        return {
            title: metadata.common.title,
            artist: metadata.common.artist,
            album: metadata.common.album,
            duration: metadata.format.duration,
            sampleRate: metadata.format.sampleRate,
            numberOfChannels: metadata.format.numberOfChannels,
            picture,
        };
    } catch (err) {
        console.error("Failed to extract metadata", err);
        return {};
    }
}
