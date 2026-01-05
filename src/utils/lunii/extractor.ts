import { parse } from "yaml";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { v2CommonKey } from "../cipher";
import { decryptXxtea } from "../crypto/xxtea";
import { getFileHandleFromPath, readFileAsArrayBuffer, readFileAsText } from "../fs";
import { uuidToRef, getImageAssetList, getAudioAssetList } from "../generators";
import { BinaryReader, decodeString } from "./binaryReader";
import { PackMetadata, StudioPack, StudioStageNode, StudioActionNode } from "./types";
import { decryptFirstBlock } from "../cipher";
import { State } from "../../builder/store/store";

export const extractPackFromDevice = async (
    luniiHandle: FileSystemDirectoryHandle,
    uuid: string
): Promise<StudioPack> => {
    const ref = uuidToRef(uuid);
    const contentDir = await luniiHandle.getDirectoryHandle(".content");
    const packDir = await contentDir.getDirectoryHandle(ref);

    // 1. Read Metadata
    let metadata: PackMetadata;
    try {
        const mdHandle = await packDir.getFileHandle("md");
        const mdYaml = await readFileAsText(mdHandle);
        metadata = parse(mdYaml);
    } catch (e) {
        metadata = { uuid, ref, title: "Pack Extrait", description: "", packType: "custom" };
    }

    // 2. Load and Decrypt Index Files
    const decrypt = decryptXxtea(v2CommonKey);

    const readAndDecrypt = async (name: string) => {
        const handle = await packDir.getFileHandle(name);
        const buffer = await readFileAsArrayBuffer(handle);
        const decrypted = await decryptFirstBlock(new Uint8Array(buffer), decrypt);
        return decrypted.buffer as ArrayBuffer;
    };

    const niBuffer = await readFileAsArrayBuffer(await packDir.getFileHandle("ni")) as ArrayBuffer;
    const riBuffer = await readAndDecrypt("ri");
    const siBuffer = await readAndDecrypt("si");
    const liBuffer = await readAndDecrypt("li");

    const niReader = new BinaryReader(niBuffer);

    // Header parsing (512 bytes)
    niReader.readInt16(); // nodes index file format version
    const version = niReader.readInt16();
    niReader.readInt32(); // nodesList start
    const nodeSize = niReader.readInt32();
    const stageNodesCount = niReader.readInt32();
    niReader.seek(512);

    const stageNodes: StudioStageNode[] = [];
    const actionNodesOptionsCount = new Map<number, number>();

    // 3. Read Stage Nodes
    for (let i = 0; i < stageNodesCount; i++) {
        const nodeStart = 512 + i * nodeSize;
        niReader.seek(nodeStart);

        const imageIndex = niReader.readInt32();
        const soundIndex = niReader.readInt32();
        const okActionIndex = niReader.readInt32();
        const okOptionsCount = niReader.readInt32();
        const okSelectedOption = niReader.readInt32();
        const homeActionIndex = niReader.readInt32();
        const homeOptionsCount = niReader.readInt32();
        const homeSelectedOption = niReader.readInt32();
        const wheel = niReader.readInt16() !== 0;
        const ok = niReader.readInt16() !== 0;
        const home = niReader.readInt16() !== 0;
        const pause = niReader.readInt16() !== 0;
        const autoplay = niReader.readInt16() !== 0;

        const stageNode: StudioStageNode = {
            uuid: i === 0 ? uuid : crypto.randomUUID(),
            controlSettings: { wheel, ok, home, pause, autoplay },
            image: imageIndex !== -1 ? getAssetPath(riBuffer, imageIndex) : undefined,
            audio: soundIndex !== -1 ? getAssetPath(siBuffer, soundIndex) : undefined,
            okTransition: okActionIndex !== -1 ? { actionNode: `action_${okActionIndex}`, optionIndex: okSelectedOption } : null,
            homeTransition: homeActionIndex !== -1 ? { actionNode: `action_${homeActionIndex}`, optionIndex: homeSelectedOption } : null,
        };

        if (okActionIndex !== -1) actionNodesOptionsCount.set(okActionIndex, okOptionsCount);
        if (homeActionIndex !== -1) actionNodesOptionsCount.set(homeActionIndex, homeOptionsCount);

        stageNodes.push(stageNode);
    }

    // 4. Reconstruct Action Nodes from 'li'
    const liReader = new BinaryReader(liBuffer);
    const actionNodes: StudioActionNode[] = [];

    for (const [offset, count] of actionNodesOptionsCount.entries()) {
        liReader.seek(offset * 4);
        const options: string[] = [];
        for (let i = 0; i < count; i++) {
            const stageNodeIndex = liReader.readInt32();
            if (stageNodes[stageNodeIndex]) {
                options.push(stageNodes[stageNodeIndex].uuid);
            }
        }

        actionNodes.push({
            id: `action_${offset}`,
            options: options
        });
    }

    return {
        uuid: metadata.uuid,
        title: metadata.title,
        description: metadata.description,
        version: version,
        stageNodes,
        actionNodes
    };
};

const getAssetPath = (buffer: ArrayBuffer, index: number): string => {
    const bytes = new Uint8Array(buffer, index * 12, 12);
    return decodeString(bytes).replace(/\\/g, '/');
};

export const extractPackAssets = async (
    luniiHandle: FileSystemDirectoryHandle,
    uuid: string,
    pack: StudioPack
): Promise<Map<string, File>> => {
    const ref = uuidToRef(uuid);
    const contentDir = await luniiHandle.getDirectoryHandle(".content");
    const packDir = await contentDir.getDirectoryHandle(ref);
    const assets = new Map<string, File>();
    const decrypt = decryptXxtea(v2CommonKey);

    // Extract Assets (Rasters & Audio)
    const imageAssetList = getImageAssetList(pack);
    const audioAssetList = getAudioAssetList(pack);

    for (const asset of imageAssetList) {
        try {
            const handle = await getFileHandleFromPath(packDir, `rf/${asset.name}`);
            const buffer = await readFileAsArrayBuffer(handle);
            const decrypted = await decryptFirstBlock(new Uint8Array(buffer), decrypt);
            assets.set(asset.name, new File([decrypted.buffer as ArrayBuffer], asset.name, { type: "image/bmp" }));
        } catch (e) { console.warn(`Failed image ${asset.name}`, e); }
    }

    for (const asset of audioAssetList) {
        if (asset.name === "BLANK_MP3") continue;
        try {
            const handle = await getFileHandleFromPath(packDir, `sf/${asset.name}`);
            const buffer = await readFileAsArrayBuffer(handle);
            const decrypted = await decryptFirstBlock(new Uint8Array(buffer), decrypt);
            assets.set(asset.name, new File([decrypted.buffer as ArrayBuffer], asset.name, { type: "audio/mpeg" }));
        } catch (e) { console.warn(`Failed audio ${asset.name}`, e); }
    }

    return assets;
};

export const savePackToLibrary = async (pack: StudioPack) => {
    // 1. Convert StudioPack to State V4 (best effort)
    const stateV4: State = {
        version: 4,
        metadata: { title: pack.title, author: "Extrait", description: pack.description },
        initialNodeUuid: pack.stageNodes[0].uuid,
        nodeIndex: {}
    };

    // Mapping between StudioPack nodes and StateV4 nodes is tricky because StateV4 is higher level.
    // For now, let's just save the project metadata and a placeholder if conversion is too lossy.
    // Ideally we'd map stageNodes to nodeIndex entries.

    const projectsRaw = localStorage.getItem("studio_projects") || "[]";
    const projects = JSON.parse(projectsRaw);

    projects.push({
        uuid: crypto.randomUUID(),
        title: pack.title,
        author: "Extrait du device",
        description: pack.description,
        lastModified: Date.now(),
        // We might need a "V5" or special format for imported packs if V4 is too restrictive
        state: stateV4
    });

    localStorage.setItem("studio_projects", JSON.stringify(projects));
};

export const generatePackBackupZip = async (pack: StudioPack, assets: Map<string, File>) => {
    const zip = new JSZip();
    zip.file("project.json", JSON.stringify(pack, null, 2));

    const rf = zip.folder("images");
    const sf = zip.folder("audio");

    assets.forEach((file, name) => {
        if (name.startsWith("000/")) {
            // Already categorized
        }
        if (file.type.includes("image")) rf?.file(name.replace("000/", ""), file);
        else sf?.file(name.replace("000/", ""), file);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `backup_${pack.title.replace(/\s+/g, '_')}_${pack.uuid}.zip`);
};
