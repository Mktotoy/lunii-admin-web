import { ActionIcon, Badge, Box, Divider, Group, Menu, Paper, Stack, Text, Code } from "@mantine/core";
import {
  IconDotsVertical,
  IconExternalLink,
  IconGripVertical,
  IconSettings,
  IconTrash,
  IconBook
} from "@tabler/icons-react";
import { FC, useEffect, useState } from "react";
import { state } from "../store";
import { useGetPackFirstRasterQuery, useRemovePackMutation, useGetOfficialThumbnailQuery } from "../queries";
import { getEstimatedPackDuration } from "../utils/lunii/durationUtils";
import { PackShell } from "../utils/lunii/packs";
import { PackInspector } from "./PackInspector";
import { modals } from "@mantine/modals";

const PackCover: FC<{ pack: PackShell }> = ({ pack }) => {
  const imageUrl = pack.metadata?.image;
  // If the image URL is from our CORS proxy or direct Lunii storage, fetch it with auth
  const isOfficial = !!imageUrl && (imageUrl.includes("corsproxy.io") || imageUrl.includes("storage.googleapis.com"));

  const { data: officialUrl } = useGetOfficialThumbnailQuery(isOfficial ? imageUrl : undefined);
  const { data: raster } = useGetPackFirstRasterQuery(pack.uuid);

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOfficial) {
      if (officialUrl) setUrl(officialUrl);
      return;
    }

    if (raster) {
      try {
        const blob = new Blob([raster as any], { type: "image/bmp" });
        const u = URL.createObjectURL(blob);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
      } catch (e) {
        console.error("Failed to create object URL for raster", e);
      }
    }
  }, [raster, isOfficial, officialUrl]);

  return (
    <Box
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {url ? (
        <img
          src={url}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          alt="Pack cover"
          crossOrigin="anonymous"
        />
      ) : (
        <IconBook size="1.2rem" opacity={0.3} />
      )}
    </Box>
  );
};

export const Pack: FC<{
  pack: PackShell;
  index: number;
  onReorder: (from: number, to: number) => void;
}> = ({ pack, index, onReorder }) => {
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [duration, setDuration] = useState<string>("...");
  const luniiHandle = state.luniiHandle.use();

  const { mutate: removePack } = useRemovePackMutation();

  useEffect(() => {
    if (luniiHandle) {
      getEstimatedPackDuration(luniiHandle, pack.uuid).then(setDuration);
    }
  }, [luniiHandle, pack.uuid]);

  const handleRemove = () => {
    modals.openConfirmModal({
      title: <Text weight={700}>Désinstaller un Pack</Text>,
      centered: true,
      children: (
        <Text size="sm">
          Êtes-vous sûr de vouloir supprimer <Code>{pack.metadata?.title || pack.uuid}</Code> de votre Lunii ?
          Cette action est irréversible.
        </Text>
      ),
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red', radius: 'md' },
      onConfirm: () => removePack(pack.uuid),
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.currentTarget.classList.add("dragging");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("dragging");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };

  return (
    <>
      <Paper
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        shadow="sm"
        radius="md"
        withBorder
        className="glass pack-card"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'grab'
        }}
        onClick={() => setMetadataModalOpen(true)}
      >
        <Box style={{ height: 160, position: 'relative', overflow: 'hidden' }}>
          <PackCover pack={pack} />

          {/* Badge overlays */}
          <Box style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4, flexDirection: 'column' }}>
            {pack.metadata?.packType === "custom" && (
              <Badge size="xs" color="aqua" variant="filled" sx={{ border: 'none' }}>Studio</Badge>
            )}
          </Box>

          <Box style={{ position: 'absolute', bottom: 8, right: 8 }}>
            <Badge variant="filled" size="xs" color="dark" sx={{ opacity: 0.8, backdropFilter: 'blur(4px)' }}>
              {duration}
            </Badge>
          </Box>
        </Box>

        <Stack p="sm" spacing={4} style={{ flex: 1 }}>
          <Group position="apart" noWrap>
            <Text size="sm" weight={700} lineClamp={1} style={{ flex: 1 }}>
              {pack.metadata?.title || "Story sans titre"}
            </Text>

            <div onClick={(e) => e.stopPropagation()}>
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle" size="sm">
                    <IconDotsVertical size="0.8rem" />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item icon={<IconExternalLink size="1rem" />} onClick={() => setMetadataModalOpen(true)}>Détails</Menu.Item>
                  <Menu.Item icon={<IconSettings size="1rem" />} color="blue">Réinstaller</Menu.Item>
                  <Divider />
                  <Menu.Item icon={<IconTrash size="1rem" />} color="red" onClick={handleRemove}>Désinstaller</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
          </Group>

          <Text size="xs" color="dimmed" lineClamp={2} style={{ minHeight: 32 }}>
            {pack.metadata?.description || "Auteur inconnu"}
          </Text>

          <Group position="apart" mt="auto" pt="xs">
            <Badge
              variant="outline"
              size="xs"
              color="gray"
              sx={{ borderStyle: 'dashed' }}
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(pack.uuid); }}
            >
              ID: {pack.uuid.substring(0, 8)}
            </Badge>

            <ActionIcon
              size="sm"
              variant="subtle"
              style={{ cursor: 'grab' }}
              onClick={(e) => e.stopPropagation()}
            >
              <IconGripVertical size="1rem" />
            </ActionIcon>
          </Group>
        </Stack>
      </Paper>

      {metadataModalOpen && (
        <PackInspector
          pack={pack}
          opened={metadataModalOpen}
          onClose={() => setMetadataModalOpen(false)}
        />
      )}
    </>
  );
};
