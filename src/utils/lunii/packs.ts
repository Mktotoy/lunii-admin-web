import { parse, stringify } from "yaml";
import { getLuniiStoreDb } from "../db";
import { getFileHandleFromPath, readFileAsText, writeFile } from "../fs";
import { PackMetadata } from "./types";
import { decryptFirstBlock, v2CommonKey } from "../cipher";
import { uuidToRef } from "../generators";
import { stripHtmlTags } from "..";
import { decryptXxtea } from "../crypto/xxtea";

export type PackShell = {
  uuid: string;
  metadata?: PackMetadata;
};

export const getPackUuids = async (luniHandle: FileSystemDirectoryHandle) => {
  const packIndexHandle = await luniHandle.getFileHandle(".pi");
  const packIndex = await packIndexHandle.getFile();
  const bytes = await packIndex.arrayBuffer();
  return readUUIDsFromBuffer(bytes);
};
export function readUUIDsFromBuffer(buffer: ArrayBuffer) {
  const uuids = [];
  for (let i = 0; i < buffer.byteLength; i += 16) {
    const uuidBytes = buffer.slice(i, i + 16);
    const uuid = bytesToUUID(new Uint8Array(uuidBytes));
    uuids.push(uuid);
  }
  return uuids;
}

function bytesToUUID(bytes: Uint8Array) {
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uuidToBytes(uuid: string) {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export const getPacksMetadata = async (
  luniiHandle: FileSystemDirectoryHandle
): Promise<PackShell[]> => {
  const packUuids = await getPackUuids(luniiHandle);
  const packsMetadata = await Promise.all(
    packUuids.map(async (uuid) => {
      try {
        const packMetadataHandle = await getFileHandleFromPath(
          luniiHandle,
          `.content/${uuidToRef(uuid)}/md`
        );
        const packMetadataYaml = await readFileAsText(packMetadataHandle);
        return {
          uuid,
          metadata: parse(packMetadataYaml) as PackMetadata,
        };
      } catch (e) {
        console.log("Metadata missing for pack ", uuid);
        return {
          uuid,
        } as PackShell;
      }
    })
  );

  return packsMetadata;
};

export const savePackMetadata = async (
  luniiHandle: FileSystemDirectoryHandle,
  uuid: string,
  metadata: PackMetadata,
  create = false
) => {
  const contentHandle = await luniiHandle.getDirectoryHandle(".content");
  const packDirectoryHandle = await contentHandle.getDirectoryHandle(
    uuidToRef(uuid)
  );
  await writeFile(packDirectoryHandle, "md", stringify(metadata), create);
};

export const writePackUuids = async (
  luniiHandle: FileSystemDirectoryHandle,
  uuids: string[]
) => {
  const packUuidsHandle = await luniiHandle.getFileHandle(".pi", {
    create: true,
  });
  const packUuidsFile = await packUuidsHandle.createWritable();
  for (const uuid of uuids) {
    const bytes = uuidToBytes(uuid);
    await packUuidsFile.write(bytes);
  }
  await packUuidsFile.close();
};

export const changePackPosition = async (
  luniiHandle: FileSystemDirectoryHandle,
  currentPosition: number,
  newPosition: number
) => {
  const uuids = await getPackUuids(luniiHandle);
  if (
    currentPosition < 0 ||
    currentPosition >= uuids.length ||
    newPosition < 0 ||
    newPosition >= uuids.length
  ) {
    throw new Error("Invalid position");
  }
  const uuid = uuids.splice(currentPosition, 1)[0];
  uuids.splice(newPosition, 0, uuid);

  await writePackUuids(luniiHandle, uuids);
};

export const addPackUuid = async (
  luniiHandle: FileSystemDirectoryHandle,
  uuid: string
) => {
  const uuids = await getPackUuids(luniiHandle);
  if (uuids.includes(uuid)) {
    throw new Error("Pack already added");
  }
  uuids.push(uuid);
  await writePackUuids(luniiHandle, uuids);
};

export const removePackUuid = async (
  luniiHandle: FileSystemDirectoryHandle,
  uuid: string
) => {
  const uuids = await getPackUuids(luniiHandle);
  const index = uuids.indexOf(uuid);
  if (index === -1) {
    throw new Error("Pack not found");
  }
  uuids.splice(index, 1);
  await writePackUuids(luniiHandle, uuids);
  console.log("Uuid removed from index: ", uuid);
};

export const syncPacksMetadataFromStore = async (
  luniHandle: FileSystemDirectoryHandle
) => {
  const luniiStoreEntries = await getLuniiStoreDb();
  const packs = await getPacksMetadata(luniHandle);

  packs.forEach(async (pack) => {
    if (pack.metadata && pack.metadata.title && pack.metadata.image) return;

    const entry = luniiStoreEntries.find((entry) => entry.uuid === pack.uuid);
    if (!entry) return;

    const metadata: PackMetadata = {
      description: stripHtmlTags(entry.localized_infos.fr_FR.description),
      title: entry.localized_infos.fr_FR.title,
      uuid: entry.uuid,
      ref: uuidToRef(entry.uuid),
      packType: "lunii",
      image: entry.thumbnailUrl,
    };

    await savePackMetadata(luniHandle, pack.uuid, metadata, true);
  });
};

export const getPackResources = async (
  handle: FileSystemDirectoryHandle,
  uuid: string
) => {
  const ref = uuidToRef(uuid);
  const resources = {
    rasters: [] as { name: string; position: number }[],
    audio: [] as { name: string; position: number }[],
  };

  try {
    const rfDir: any = await getFileHandleFromPath(handle, `.content/${ref}/rf/000`).catch(() => null);
    if (rfDir && rfDir.kind === "directory") {
      for await (const entry of rfDir.values()) {
        if ((entry as any).kind === "file") {
          resources.rasters.push({ name: entry.name, position: parseInt(entry.name) });
        }
      }
    }

    const sfDir: any = await getFileHandleFromPath(handle, `.content/${ref}/sf/000`).catch(() => null);
    if (sfDir && sfDir.kind === "directory") {
      for await (const entry of sfDir.values()) {
        if ((entry as any).kind === "file") {
          resources.audio.push({ name: entry.name, position: parseInt(entry.name) });
        }
      }
    }
  } catch (e) {
    console.error("Failed to list pack resources", e);
  }

  return resources;
};

export const getPackRaster = async (
  handle: FileSystemDirectoryHandle,
  uuid: string,
  rasterName: string
) => {
  const ref = uuidToRef(uuid);
  const rasterFile = await getFileHandleFromPath(
    handle,
    `.content/${ref}/rf/000/${rasterName}`
  );
  const raster = await rasterFile
    .getFile()
    .then((f) => f.arrayBuffer())
    .then((ab) => new Uint8Array(ab));

  return decryptFirstBlock(raster, decryptXxtea(v2CommonKey));
};

export const getPackFirstRaster = async (
  handle: FileSystemDirectoryHandle,
  uuid: string
) => {
  const ref = uuidToRef(uuid);
  const riHandle = await getFileHandleFromPath(handle, `.content/${ref}/ri`).catch(() => null);
  if (!riHandle) return null;

  const ri = await (riHandle as FileSystemFileHandle)
    .getFile()
    .then((f) => f.arrayBuffer())
    .then((ab) => new Uint8Array(ab));
  const decodedRi = await decryptFirstBlock(ri, decryptXxtea(v2CommonKey));
  const fistRasterAdress = new TextDecoder()
    .decode(decodedRi.slice(0, 12))
    .replace("\\", "/");

  // Address is usually like "000\00000000"
  const parts = fistRasterAdress.split(/[\\/]/);
  const rasterName = parts[parts.length - 1].trim();

  const rasterFile = await getFileHandleFromPath(
    handle,
    `.content/${ref}/rf/000/${rasterName}`
  ).catch(() => null);

  if (!rasterFile) return null;

  const raster = await (rasterFile as FileSystemFileHandle)
    .getFile()
    .then((f) => f.arrayBuffer())
    .then((ab) => new Uint8Array(ab));

  return decryptFirstBlock(raster, decryptXxtea(v2CommonKey));
};

export const getDeviceStorageUsage = async (handle: FileSystemDirectoryHandle) => {
  let totalSize = 0;

  async function calculateSize(dirHandle: FileSystemDirectoryHandle) {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "file") {
        const file = await entry.getFile();
        totalSize += file.size;
      } else {
        await calculateSize(entry);
      }
    }
  }

  try {
    const contentHandle = await handle.getDirectoryHandle(".content");
    await calculateSize(contentHandle);
  } catch (e) {
    console.warn("Could not calculate storage usage", e);
  }

  return totalSize;
};
