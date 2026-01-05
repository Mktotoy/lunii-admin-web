import {
    Modal,
    Tabs,
    Table,
    ScrollArea,
    Text,
    Group,
    Badge,
    Stack,
    Title,
    TextInput,
    Textarea,
    Button,
    Card,
    SimpleGrid,
    Image,
    Box,
    Loader,
    Divider
} from "@mantine/core";
import {
    IconPhoto,
    IconMusic,
    IconInfoCircle,
    IconDeviceFloppy,
    IconDownload,
    IconPlayerPlay,
    IconBinary,
    IconUpload,
    IconCopy
} from "@tabler/icons-react";
import { FC, useEffect, useState } from "react";
import { PackShell } from "../utils/lunii/packs";
import { useGetPackResourcesQuery, useGetPackRasterQuery, useSavePackMetadataMutation } from "../queries";
import { extractPackFromDevice, extractPackAssets, generatePackBackupZip, savePackToLibrary } from "../utils/lunii/extractor";
import { notifications } from "@mantine/notifications";
import { state } from "../store";
import { uuidToRef } from "../utils/generators";

const RasterItem: FC<{ uuid: string; rasterName: string; position: number }> = ({ uuid, rasterName, position }) => {
    const { data: raster } = useGetPackRasterQuery(uuid, rasterName);
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        if (raster) {
            const blob = new Blob([raster as any], { type: 'image/bmp' });
            const objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [raster]);

    return (
        <Card withBorder padding="xs" radius="md">
            <Card.Section>
                {url ? (
                    <Image src={url} height={120} alt={rasterName} fit="contain" bg="gray.1" />
                ) : (
                    <Box h={120} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader size="sm" />
                    </Box>
                )}
            </Card.Section>
            <Text size="xs" align="center" mt="xs" color="dimmed">
                {rasterName} (#{position})
            </Text>
        </Card>
    );
};

interface PackInspectorProps {
    pack: PackShell;
    opened: boolean;
    onClose: () => void;
}

export const PackInspector: FC<PackInspectorProps> = ({ pack, opened, onClose }) => {
    const { data: resources, isLoading: loadingResources } = useGetPackResourcesQuery(pack.uuid);
    const [metadata, setMetadata] = useState(pack.metadata || { title: "", description: "", author: "", uuid: pack.uuid, ref: uuidToRef(pack.uuid), packType: "custom" });
    const { mutate: saveMetadata, isLoading: savingMetadata } = useSavePackMetadataMutation();
    const [extracting, setExtracting] = useState(false);

    useEffect(() => {
        if (pack.metadata) setMetadata(pack.metadata);
    }, [pack.metadata]);

    const handleSaveMetadata = () => {
        saveMetadata({ uuid: pack.uuid, metadata });
    };

    const handleDownloadBackup = async () => {
        const root = state.luniiHandle.peek();
        if (!root) return;
        setExtracting(true);
        try {
            const studioPack = await extractPackFromDevice(root, pack.uuid);
            const assets = await extractPackAssets(root, pack.uuid, studioPack);
            await generatePackBackupZip(studioPack, assets);
            notifications.show({ title: "Succès", message: "Archive de sauvegarde générée", color: "green" });
        } catch (err) {
            notifications.show({ title: "Erreur", message: "Échec de la sauvegarde", color: "red" });
        } finally {
            setExtracting(false);
        }
    };

    const handleImportToStudio = async () => {
        const root = state.luniiHandle.peek();
        if (!root) return;
        setExtracting(true);
        try {
            const studioPack = await extractPackFromDevice(root, pack.uuid);
            await savePackToLibrary(studioPack);
            notifications.show({ title: "Succès", message: "Pack importé dans votre bibliothèque Studio", color: "green" });
        } catch (err) {
            console.error(err);
            notifications.show({ title: "Erreur", message: "Échec de l'importation", color: "red" });
        } finally {
            setExtracting(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Title order={3}>Inspecteur: {pack.metadata?.title || pack.uuid}</Title>}
            size="xl"
            radius="md"
        >
            <Tabs defaultValue="metadata" variant="pills" radius="md">
                <Tabs.List mb="md">
                    <Tabs.Tab value="metadata" icon={<IconInfoCircle size="1rem" />}>Métadonnées</Tabs.Tab>
                    <Tabs.Tab value="rasters" icon={<IconPhoto size="1rem" />}>Images ({resources?.rasters.length || 0})</Tabs.Tab>
                    <Tabs.Tab value="audio" icon={<IconMusic size="1rem" />}>Audio ({resources?.audio.length || 0})</Tabs.Tab>
                    <Tabs.Tab value="binary" icon={<IconBinary size="1rem" />}>Binaire</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="metadata">
                    <Stack spacing="md">
                        <TextInput label="Titre" value={metadata.title} onChange={(e) => setMetadata({ ...metadata, title: e.target.value })} />
                        <TextInput label="Auteur" value={metadata.author || ""} onChange={(e) => setMetadata({ ...metadata, author: e.target.value })} />
                        <Textarea label="Description" value={metadata.description} onChange={(e) => setMetadata({ ...metadata, description: e.target.value })} minRows={3} />
                        <Group position="right">
                            <Button leftIcon={<IconDeviceFloppy size="1rem" />} onClick={handleSaveMetadata} loading={savingMetadata}>Enregistrer</Button>
                        </Group>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="rasters">
                    <ScrollArea h={400}>
                        {loadingResources ? <Group position="center" py="xl"><Loader /></Group> : (
                            <SimpleGrid cols={4} spacing="md">
                                {resources?.rasters.map((r) => <RasterItem key={r.name} uuid={pack.uuid} rasterName={r.name} position={r.position} />)}
                            </SimpleGrid>
                        )}
                    </ScrollArea>
                </Tabs.Panel>

                <Tabs.Panel value="audio">
                    <ScrollArea h={400}>
                        <Table verticalSpacing="xs">
                            <thead><tr><th>Position</th><th>Fichier</th><th>Action</th></tr></thead>
                            <tbody>
                                {resources?.audio.map((a) => (
                                    <tr key={a.name}>
                                        <td><Badge variant="outline">{a.position}</Badge></td>
                                        <td><Text size="sm">{a.name}</Text></td>
                                        <td><Button variant="subtle" size="xs" leftIcon={<IconPlayerPlay size="0.8rem" />}>Lire</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </ScrollArea>
                </Tabs.Panel>

                <Tabs.Panel value="binary">
                    <Stack spacing="xs">
                        <Card withBorder radius="md">
                            <Group position="apart"><Text weight={700}>ni (Nodes Index)</Text><Badge color="blue">{resources?.rasters.length || 0} rasters</Badge></Group>
                        </Card>
                    </Stack>
                </Tabs.Panel>
            </Tabs>

            <Divider my="lg" />
            <Group position="apart">
                <Button variant="light" color="orange" leftIcon={<IconCopy size="1rem" />} disabled>Cloner</Button>
                <Group>
                    <Button variant="light" leftIcon={<IconDownload size="1rem" />} onClick={handleDownloadBackup} loading={extracting}>Sauvegarder</Button>
                    <Button leftIcon={<IconUpload size="1rem" />} onClick={handleImportToStudio} loading={extracting} className="gradient-button">Importer</Button>
                </Group>
            </Group>
        </Modal>
    );
};
