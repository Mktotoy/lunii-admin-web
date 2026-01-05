import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { resetInstallationState, state } from "./store";
import { uuidToRef } from "./utils/generators";
import { installPack } from "./utils/lunii/installPack";
import {
  changePackPosition,
  getPackFirstRaster,
  getPacksMetadata,
  removePackUuid,
  savePackMetadata,
  syncPacksMetadataFromStore,
} from "./utils/lunii/packs";
import { PackMetadata } from "./utils/lunii/types";
import { getDeviceInfo } from "./utils/lunii/device";

export const useGetPacksQuery = () => {
  const luniiHandle = state.luniiHandle.use();
  return useQuery(["packs"], () => getPacksMetadata(luniiHandle!), {
    enabled: !!luniiHandle,
  });
};

export const useReorderPackMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationKey: "reorderPacks",
    mutationFn: async (options: { from: number; to: number }) =>
      changePackPosition(state.luniiHandle.peek()!, options.from, options.to),
    onSuccess: () => client.invalidateQueries("packs"),
    onError: (err) =>
      notifications.show({
        title: "Erreur",
        message: (err as Error).message,
        color: "red",
      }),
  });
};

export const useRemovePackMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationKey: "reorderPacks",
    mutationFn: async (packUuid: string) => {
      const deviceHandle = state.luniiHandle.peek()!;
      const contentDir = await deviceHandle.getDirectoryHandle(".content");

      // remove pack uuid from the device index
      await removePackUuid(deviceHandle, packUuid);

      // remove pack content
      await contentDir.removeEntry(uuidToRef(packUuid), {
        recursive: true,
      });

      console.log("Pack removed");
    },
    onError: (err) =>
      notifications.show({
        title: "Erreur",
        message: (err as Error).message,
        color: "red",
      }),
    onSuccess: () => client.invalidateQueries("packs"),
  });
};

export const useInstallPack = () => {
  const client = useQueryClient();
  return async () => {
    try {
      const fileHandles = await window.showOpenFilePicker({
        types: [{ accept: { "application/zip": [".zip"] } }],
        multiple: true,
      });
      const device = state.device.peek()!;
      const installation = state.installation;
      installation.isInstalling.set(true);
      installation.packInstallationProgress.totalCount.set(fileHandles.length);

      for (const fileHandle of fileHandles) {
        await installPack(fileHandle, device);
        installation.packInstallationProgress.doneCount.set(
          installation.packInstallationProgress.doneCount.peek() + 1
        );
      }
      notifications.show({
        title: "Installation terminée",
        message: `Les packs ont été installés avec succès`,
        color: "green",
      });
    } catch (err) {
      console.log(err);
      notifications.show({
        title: "Erreur",
        message: (err as Error).message,
        color: "red",
      });
    } finally {
      resetInstallationState();
      client.invalidateQueries("packs");
    }
  };
};

export const useSyncMetadataMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => syncPacksMetadataFromStore(state.luniiHandle.peek()!),
    onSuccess: () =>
      notifications.show({
        title: "Synchronisation terminée",
        message: "Les métadonnées ont été synchronisées avec succès",
        color: "green",
      }),
    onError: (err) =>
      notifications.show({
        title: "Erreur",
        message: (err as Error).message,
        color: "red",
      }),
    onSettled: () => {
      client.invalidateQueries("packs");
    },
  });
};

export const useGetPackFirstRasterQuery = (uuid: string) =>
  useQuery(["pack-raster", uuid], () => {
    const deviceHandle = state.luniiHandle.peek()!;
    return getPackFirstRaster(deviceHandle, uuid);
  });

export const useSavePackMetadataMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationKey: "updatePackMetadata",
    onSettled: () => {
      client.invalidateQueries("packs");
    },
    mutationFn: async ({
      uuid,
      metadata,
      shouldCreate = false,
    }: {
      uuid: string;
      metadata: PackMetadata;
      shouldCreate?: boolean;
    }) => {
      const deviceHandle = state.luniiHandle.peek()!;
      await savePackMetadata(deviceHandle, uuid, metadata, shouldCreate);
    },
  });
};

export const useGetPackResourcesQuery = (uuid: string) => {
  const luniiHandle = state.luniiHandle.use();
  return useQuery(["pack-resources", uuid], () => {
    if (!luniiHandle) return null;
    return import("./utils/lunii/packs").then(m => m.getPackResources(luniiHandle, uuid));
  }, { enabled: !!luniiHandle });
};

export const useGetPackRasterQuery = (uuid: string, rasterName: string) => {
  const luniiHandle = state.luniiHandle.use();
  return useQuery(["pack-raster", uuid, rasterName], () => {
    if (!luniiHandle) return null;
    return import("./utils/lunii/packs").then(m => m.getPackRaster(luniiHandle, uuid, rasterName));
  }, { enabled: !!luniiHandle && !!rasterName });
};

export const useGetDeviceStorageUsageQuery = () => {
  const luniiHandle = state.luniiHandle.use();
  return useQuery(["storage-usage"], () => {
    if (!luniiHandle) return 0;
    return import("./utils/lunii/packs").then(m => m.getDeviceStorageUsage(luniiHandle));
  }, { enabled: !!luniiHandle });
};

export const useGetDeviceInfoQuery = () => {
  const luniiHandle = state.luniiHandle.use();
  return useQuery(["device-info"], () => getDeviceInfo(luniiHandle!), {
    enabled: !!luniiHandle,
  });
};

export const useGetOfficialThumbnailQuery = (url: string | undefined) => {
  return useQuery(["official-thumbnail", url], async () => {
    if (!url) return null;
    const { getGuestToken } = await import("./utils/db");
    const token = await getGuestToken();

    // Determine if we need to add the proxy prefix
    let finalUrl = url;
    if (!url.includes("corsproxy.io")) {
      finalUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    }

    const response = await fetch(finalUrl, {
      headers: { "X-AUTH-TOKEN": token },
    });
    if (!response.ok) throw new Error("Failed to fetch thumbnail");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }, {
    enabled: !!url && (url.includes("corsproxy.io") || url.includes("storage.googleapis.com")),
    staleTime: Infinity,
  });
};
