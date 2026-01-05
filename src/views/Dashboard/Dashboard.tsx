import { Title, Text, SimpleGrid, Paper, Group, Stack, RingProgress, Center, Button, Badge, Divider } from "@mantine/core";
import { IconDeviceDesktop, IconHammer, IconDatabase, IconPlugConnected, IconInfoCircle, IconSettings, IconCheck, IconRefresh } from "@tabler/icons-react";
import { useGetPacksQuery, useReorderPackMutation, useSyncMetadataMutation, useGetDeviceInfoQuery } from "../../queries";
import { useEffect, useState } from "react";
import { state } from "../../store";
import { getLuniiHandle } from "../../utils";
import { getDeviceInfo } from "../../utils/lunii/deviceInfo";
import { Pack } from "../../components/Pack";
import { PackShell } from "../../utils/lunii/packs";
import { InstallModal } from "../../components/InstallModal";

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ConnectionGuide = () => {
    // ... (ConnectionGuide code remains unchanged)
    return (
        <Paper p="xl" radius="md" withBorder className="glass">
            <Stack align="center" spacing="xl" py="lg">
                <IconPlugConnected size="4rem" color="#228be6" stroke={1.5} />
                <Stack align="center" spacing={5}>
                    <Title order={2} align="center">Connectez votre Ma Fabrique à Histoires</Title>
                    <Text color="dimmed" align="center" maw={500}>
                        Pour gérer vos packs et voir les statistiques de votre appareil, vous devez autoriser l'accès au support amovible de votre Lunii.
                    </Text>
                </Stack>

                <SimpleGrid cols={3} spacing="xl" mt="md" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
                    <Stack align="center" spacing="xs">
                        <Center sx={(theme) => ({ width: 40, height: 40, borderRadius: '50%', background: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.blue[0] })}>
                            <Text weight={700} color="blue">1</Text>
                        </Center>
                        <Text size="xs" weight={700} align="center">Branchez</Text>
                        <Text size="xs" color="dimmed" align="center" sx={{ maxWidth: 150 }}>Allumez et reliez votre Lunii en USB</Text>
                    </Stack>
                    <Stack align="center" spacing="xs">
                        <Center sx={(theme) => ({ width: 40, height: 40, borderRadius: '50%', background: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.blue[0] })}>
                            <Text weight={700} color="blue">2</Text>
                        </Center>
                        <Text size="xs" weight={700} align="center">Sélectionnez</Text>
                        <Text size="xs" color="dimmed" align="center" sx={{ maxWidth: 150 }}>Choisissez le dossier racine (LUNII)</Text>
                    </Stack>
                    <Stack align="center" spacing="xs">
                        <Center sx={(theme) => ({ width: 40, height: 40, borderRadius: '50%', background: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.blue[0] })}>
                            <Text weight={700} color="blue">3</Text>
                        </Center>
                        <Text size="xs" weight={700} align="center">Accès PRO</Text>
                        <Text size="xs" color="dimmed" align="center" sx={{ maxWidth: 150 }}>Accédez à votre bibliothèque complète</Text>
                    </Stack>
                </SimpleGrid>

                <Button
                    size="lg"
                    mt="xl"
                    className="gradient-button"
                    onClick={async () => {
                        const handle = await getLuniiHandle();
                        if (handle) {
                            const info = await getDeviceInfo(handle);
                            state.device.set(info);
                            state.luniiHandle.set(handle);
                        }
                    }}
                >
                    Connecter mon appareil
                </Button>
            </Stack>
        </Paper>
    );
};

export const Dashboard = () => {
    const luniiHandle = state.luniiHandle.use();
    const { data: packList } = useGetPacksQuery();
    const { mutate: movePack } = useReorderPackMutation();
    const { mutate: syncMetadata, isLoading: syncing } = useSyncMetadataMutation();
    const { data: deviceInfo } = useGetDeviceInfoQuery();

    const [storageInfo, setStorageInfo] = useState({
        used: 0,
        total: 4 * 1024 * 1024 * 1024,
        percent: 0,
        breakdown: { audio: 0, images: 0, system: 0, other: 0 }
    });
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        if (luniiHandle) {
            calculateStorage();
        }
    }, [luniiHandle, packList]);

    const calculateStorage = async () => {
        if (!luniiHandle) return;
        setAnalyzing(true);
        try {
            let audioUsed = 0;
            let imagesUsed = 0;
            let systemUsed = 0;
            let totalUsedFull = 0;

            const traverse = async (handle: any) => {
                for await (const entry of handle.values()) {
                    if (entry.kind === 'file') {
                        const file = await entry.getFile();
                        totalUsedFull += file.size;
                        if (['ni', 'li', 'ri', 'si', 'bt'].includes(entry.name)) {
                            systemUsed += file.size;
                        }
                    } else if (entry.kind === 'directory') {
                        if (entry.name === 'sf') {
                            const size = await getDirSize(entry);
                            audioUsed += size;
                            totalUsedFull += size;
                        } else if (entry.name === 'rf') {
                            const size = await getDirSize(entry);
                            imagesUsed += size;
                            totalUsedFull += size;
                        } else {
                            await traverse(entry);
                        }
                    }
                }
            };

            const getDirSize = async (dirHandle: any) => {
                let size = 0;
                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'file') {
                        size += (await entry.getFile()).size;
                    } else if (entry.kind === 'directory') {
                        size += await getDirSize(entry);
                    }
                }
                return size;
            };

            await traverse(luniiHandle);
            const total = 4 * 1024 * 1024 * 1024;
            setStorageInfo({
                used: totalUsedFull,
                total,
                percent: Math.round((totalUsedFull / total) * 100),
                breakdown: {
                    audio: audioUsed,
                    images: imagesUsed,
                    system: systemUsed,
                    other: Math.max(0, totalUsedFull - audioUsed - imagesUsed - systemUsed)
                }
            });
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <Stack spacing="xl">
            <Group position="apart">
                <Stack spacing={0}>
                    <Title order={1}>Bienvenue sur Lunii Admin PRO</Title>
                    <Text color="dimmed">Vue d'ensemble et gestion de votre Ma Fabrique à Histoires</Text>
                </Stack>
                {luniiHandle && <InstallModal />}
            </Group>

            {luniiHandle ? (
                <>
                    <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
                        {/* Storage Card */}
                        <Paper p="md" radius="md" withBorder className="glass">
                            <Group position="apart" mb="xs">
                                <Text size="sm" weight={700} color="dimmed" transform="uppercase">STOCKAGE</Text>
                                <IconDatabase size="1.2rem" stroke={1.5} color="blue" />
                            </Group>
                            <Group position="center" my="md">
                                <RingProgress
                                    size={120}
                                    roundCaps
                                    thickness={12}
                                    sections={[
                                        { value: (storageInfo.breakdown.audio / storageInfo.total) * 100, color: 'aqua', tooltip: `Audio: ${formatSize(storageInfo.breakdown.audio)}` },
                                        { value: (storageInfo.breakdown.images / storageInfo.total) * 100, color: 'yellow', tooltip: `Images: ${formatSize(storageInfo.breakdown.images)}` },
                                        { value: (storageInfo.breakdown.system / storageInfo.total) * 100, color: 'gray.6', tooltip: `Système: ${formatSize(storageInfo.breakdown.system)}` },
                                        { value: (storageInfo.breakdown.other / storageInfo.total) * 100, color: 'gray.4', tooltip: `Autre: ${formatSize(storageInfo.breakdown.other)}` },
                                    ]}
                                    label={
                                        <Center>
                                            <Text weight={700} size="xl">{storageInfo.percent}%</Text>
                                        </Center>
                                    }
                                />
                            </Group>
                            <Group position="center" spacing="xs" mt="md">
                                <Badge size="xs" variant="dot" color="aqua">Audio</Badge>
                                <Badge size="xs" variant="dot" color="yellow">Images</Badge>
                                <Badge size="xs" variant="dot" color="gray.6">Système</Badge>
                                <Badge size="xs" variant="dot" color="gray.4">Autre</Badge>
                            </Group>
                            <Stack spacing={5} mt="md">
                                <Group position="apart">
                                    <Text size="xs">Utilisé / Libre</Text>
                                    <Text size="xs" weight={700}>{formatSize(storageInfo.used)} / {formatSize(storageInfo.total - storageInfo.used)}</Text>
                                </Group>
                            </Stack>
                        </Paper>

                        {/* System Status Card */}
                        <Paper p="md" radius="md" withBorder className="glass">
                            <Group position="apart" mb="xs">
                                <Text size="sm" weight={700} color="dimmed" transform="uppercase">ÉTAT DU SYSTÈME</Text>
                                <IconInfoCircle size="1.2rem" stroke={1.5} color="cyan" />
                            </Group>
                            <Stack spacing="sm" mt="md">
                                <Group position="apart">
                                    <Text size="sm">Index (.pi)</Text>
                                    <Badge color="green" variant="light" leftSection={<IconCheck size="0.8rem" />}>Valide</Badge>
                                </Group>
                                <Group position="apart">
                                    <Text size="sm">Firmware</Text>
                                    <Text size="sm" weight={700}>v{deviceInfo?.firmwareMajor}.{deviceInfo?.firmwareMinor || '?'}</Text>
                                </Group>
                                <Group position="apart">
                                    <Text size="sm">Série</Text>
                                    <Text size="xs" color="dimmed">{deviceInfo?.serialNumber || 'Inconnu'}</Text>
                                </Group>
                                <Group position="apart" mt="md">
                                    <Text size="sm">Packs Installés</Text>
                                    <Text size="sm" weight={700}>{packList?.length || 0}</Text>
                                </Group>
                            </Stack>
                        </Paper>

                        {/* Quick Actions Card */}
                        <Paper p="md" radius="md" withBorder className="glass">
                            <Group position="apart" mb="xs">
                                <Text size="sm" weight={700} color="dimmed" transform="uppercase">ACTIONS RAPIDES</Text>
                                <IconSettings size="1.2rem" stroke={1.5} color="teal" />
                            </Group>
                            <Stack spacing="xs" mt="md">
                                <Button variant="light" leftIcon={<IconRefresh size="1rem" />} loading={analyzing} onClick={calculateStorage}>
                                    Analyser le stockage
                                </Button>
                                <Divider my="xs" label="Maintenance" labelPosition="center" />
                                <Button variant="light" color="blue" leftIcon={<IconHammer size="1rem" />} component="a" onClick={() => state.currentTab.set('studio')}>
                                    Ouvrir le Studio
                                </Button>
                            </Stack>
                        </Paper>
                    </SimpleGrid>

                    {/* Pack List */}
                    <Paper p="md" radius="md" withBorder className="glass">
                        <Group position="apart" mb="md">
                            <Group spacing="sm">
                                <Title order={3}>Bibliothèque d'Histoires ({packList?.length || 0})</Title>
                                <Button
                                    variant="subtle"
                                    compact
                                    size="xs"
                                    leftIcon={<IconRefresh size="1rem" />}
                                    loading={syncing}
                                    onClick={() => syncMetadata()}
                                >
                                    Sync. Métadonnées
                                </Button>
                            </Group>
                            <Text size="xs" color="dimmed">Faites glisser pour réordonner</Text>
                        </Group>
                        <Divider mb="xl" />
                        <SimpleGrid
                            cols={4}
                            spacing="lg"
                            breakpoints={[
                                { maxWidth: 'xl', cols: 4 },
                                { maxWidth: 'lg', cols: 3 },
                                { maxWidth: 'md', cols: 2 },
                                { maxWidth: 'xs', cols: 1 },
                            ]}
                        >
                            {packList?.map((pack: PackShell, i: number) => (
                                <Pack
                                    key={pack.uuid}
                                    pack={pack}
                                    index={i}
                                    onReorder={(from, to) => movePack({ from, to })}
                                />
                            ))}
                        </SimpleGrid>
                        {packList?.length === 0 && (
                            <Center py="xl">
                                <Stack align="center" spacing="xs">
                                    <IconDeviceDesktop size="3rem" color="gray" style={{ opacity: 0.3 }} />
                                    <Text color="dimmed">Aucun pack installé pour le moment.</Text>
                                </Stack>
                            </Center>
                        )}
                    </Paper>
                </>
            ) : (
                <ConnectionGuide />
            )}
        </Stack>
    );
};
