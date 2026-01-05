import {
    Paper,
    Text,
    Stack,
    Group,
    Button,
    FileButton,
    Divider,
    TextInput,
    Title,
    ActionIcon,
    Center,
    Progress,
    Image,
    Box,
    Modal
} from "@mantine/core";
import {
    IconMusic,
    IconPlus,
    IconTrash,
    IconDeviceFloppy,
    IconDisc,
    IconPhoto,
    IconInfoCircle,
    IconAlertCircle,
    IconChevronRight,
    IconArrowRight
} from "@tabler/icons-react";
import { FC, useState, useEffect } from "react";
import { extractAudioMetadata, AudioMetadata } from "../builder/utils/metadata";
import { StudioPack, StudioStageNode, StudioActionNode } from "../utils/lunii/types";
import { installStudioPack } from "../utils/lunii/installStudioPack";
import { state } from "../store";
import { notifications } from "@mantine/notifications";
import { generatePlaceholderCover } from "../utils/generators/cover";
import { reworkAudio } from "../utils/converters/audio";

interface Track {
    file: File;
    metadata: AudioMetadata;
    title: string;
    image?: File;
    validationErrors?: string[];
    reworking?: boolean;
}

const TrackImagePreview = ({ file, fallbackUrl }: { file?: File, fallbackUrl: string | null }) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (file) {
            const u = URL.createObjectURL(file);
            setUrl(u);
            return () => URL.revokeObjectURL(u);
        }
        setUrl(null);
    }, [file]);

    return (
        <Image
            src={url || fallbackUrl || undefined}
            alt="Track"
            width={40}
            height={30}
            radius="xs"
            fit="cover"
            withPlaceholder={!url && !fallbackUrl}
        />
    );
};

export const MusicAlbumTool: FC = () => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [albumTitle, setAlbumTitle] = useState("");
    const [albumArtist, setAlbumArtist] = useState("");
    const [albumCover, setAlbumCover] = useState<File | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [installing, setInstalling] = useState(false);
    const [infoOpened, setInfoOpened] = useState(false);
    const installationState = state.installation.use();

    useEffect(() => {
        if (albumCover) {
            const url = URL.createObjectURL(albumCover);
            setCoverUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setCoverUrl(null);
        }
    }, [albumCover]);

    const validateTrack = (track: { metadata: AudioMetadata }): string[] => {
        const errors: string[] = [];
        if (track.metadata.sampleRate && track.metadata.sampleRate !== 32000 && track.metadata.sampleRate !== 44100) {
            errors.push(`Fréquence: ${track.metadata.sampleRate}Hz (attendu 32000 ou 44100)`);
        }
        if (track.metadata.numberOfChannels && track.metadata.numberOfChannels !== 1) {
            errors.push("Canaux: Stéréo (attendu Mono)");
        }
        return errors;
    };

    const handleAddFiles = async (files: File[]) => {
        const newTracks: Track[] = [];
        for (const file of files) {
            const metadata = await extractAudioMetadata(file);
            const validationErrors = validateTrack({ metadata });
            newTracks.push({
                file,
                metadata,
                validationErrors,
                title: metadata.title || file.name.replace(/\.[^/.]+$/, "")
            });

            if (!albumTitle && metadata.album) setAlbumTitle(metadata.album);
            if (!albumArtist && metadata.artist) setAlbumArtist(metadata.artist);
        }
        setTracks([...tracks, ...newTracks]);
    };

    const handleReworkTrack = async (index: number) => {
        const track = tracks[index];
        setTracks(prev => prev.map((t, i) => i === index ? { ...t, reworking: true } : t));

        try {
            const reworkedFile = await reworkAudio(track.file);
            const metadata = await extractAudioMetadata(reworkedFile);
            const validationErrors = validateTrack({ metadata });

            setTracks(prev => prev.map((t, i) => i === index ? {
                ...t,
                file: reworkedFile,
                metadata,
                validationErrors,
                reworking: false
            } : t));

            notifications.show({ title: "Piste corrigée", message: `La piste ${index + 1} a été normalisée.`, color: "green" });
        } catch (err) {
            notifications.show({ title: "Erreur", message: "Le traitement a échoué", color: "red" });
            setTracks(prev => prev.map((t, i) => i === index ? { ...t, reworking: false } : t));
        }
    };

    const handleReworkAll = async () => {
        const indicesToRework = tracks
            .map((t, i) => t.validationErrors && t.validationErrors.length > 0 ? i : -1)
            .filter(i => i !== -1);

        for (const index of indicesToRework) {
            await handleReworkTrack(index);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData("index", index.toString());
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData("index"));
        if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

        const newTracks = [...tracks];
        const [movedTrack] = newTracks.splice(sourceIndex, 1);
        newTracks.splice(targetIndex, 0, movedTrack);
        setTracks(newTracks);
    };

    const handleTrackImageChange = (index: number, file: File | null) => {
        if (!file) return;
        setTracks(prev => prev.map((t, i) => i === index ? { ...t, image: file } : t));
    };

    const handleTrackTitleChange = (index: number, title: string) => {
        setTracks(prev => prev.map((t, i) => i === index ? { ...t, title } : t));
    };

    const handleInstall = async () => {
        if (tracks.length === 0) return;
        setInstalling(true);

        const device = state.device.peek();
        const handle = state.luniiHandle.peek();
        if (!device || !handle) {
            notifications.show({ title: "Erreur", message: "Aucun appareil détecté ou reconnu", color: "red" });
            setInstalling(false);
            return;
        }

        try {
            const packUuid = crypto.randomUUID();
            const assets = new Map<string, File>();

            // 0. Handle Album Cover
            let coverFile = albumCover;
            if (!coverFile) {
                const placeholderBlob = await generatePlaceholderCover(albumTitle || "Album Musique", albumArtist || "Artiste Inconnu");
                coverFile = new File([placeholderBlob], "cover.png", { type: "image/png" });
            }
            assets.set("menu.full", coverFile);

            // Create Stage Nodes
            const stageNodes: StudioStageNode[] = [];

            // 1. Menu Node (Index 0)
            const menuNode: StudioStageNode = {
                uuid: crypto.randomUUID(),
                controlSettings: { wheel: true, ok: true, home: false, pause: false, autoplay: false, pause_can_resume: true } as any,
                image: "menu.full",
                okTransition: { actionNode: "choice_menu", optionIndex: 0 },
                homeTransition: null
            };
            stageNodes.push(menuNode);

            // 2. Playback and Selection Nodes
            const selectUuids = tracks.map(() => crypto.randomUUID());
            const playUuids = tracks.map(() => crypto.randomUUID());
            const actionNodes: StudioActionNode[] = [];

            // Entry action for the pack cover
            actionNodes.push({
                id: "cover_action",
                options: [menuNode.uuid]
            });

            tracks.forEach((track, i) => {
                const audioName = `track_${i}.mp3`;
                const imageName = track.image ? `track_${i}.png` : "menu.full";

                assets.set(audioName, track.file);
                if (track.image) {
                    assets.set(imageName, track.image);
                }

                const isLast = i === tracks.length - 1;

                // Selection Stage (What we see/hear in the choice menu)
                stageNodes.push({
                    uuid: selectUuids[i],
                    audio: audioName,
                    image: imageName,
                    controlSettings: { wheel: true, ok: true, home: true, pause: false, autoplay: true, pause_can_resume: false } as any,
                    okTransition: { actionNode: `play_action_${i}`, optionIndex: 0 },
                    homeTransition: { actionNode: "cover_action", optionIndex: 0 }
                });

                // Playback Stage (Sequential play mode)
                stageNodes.push({
                    uuid: playUuids[i],
                    audio: audioName,
                    image: imageName,
                    controlSettings: { wheel: false, ok: true, home: true, pause: true, autoplay: true, pause_can_resume: true } as any,
                    okTransition: { actionNode: isLast ? "choice_menu" : `play_action_${i + 1}`, optionIndex: 0 },
                    homeTransition: { actionNode: "choice_menu", optionIndex: i }
                });

                actionNodes.push({
                    id: `play_action_${i}`,
                    options: [playUuids[i]]
                });
            });

            // Main choice menu action
            actionNodes.push({
                id: "choice_menu",
                options: selectUuids
            });

            const pack: StudioPack = {
                uuid: packUuid,
                title: albumTitle || "Album Musique",
                description: `Album par ${albumArtist || 'Inconnu'}`,
                version: 1,
                stageNodes,
                actionNodes
            };

            await installStudioPack(pack, assets, device as any);
            notifications.show({ title: "Succès", message: "L'album a été installé !", color: "green" });
        } catch (err) {
            console.error(err);
            notifications.show({ title: "Erreur", message: "L'installation a échoué", color: "red" });
        } finally {
            setInstalling(false);
        }
    };

    return (
        <Stack spacing="lg">
            <Paper p="xl" radius="md" withBorder className="glass">
                <Box mb="xl" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack spacing={0}>
                        <Group spacing="xs">
                            <IconDisc size="2rem" color="#228be6" />
                            <Title order={2}>Créateur d'Album Musique</Title>
                        </Group>
                        <Text color="dimmed">Transformez vos MP3 en un pack Lunii en quelques clics.</Text>
                    </Stack>

                    <Button
                        variant="subtle"
                        color="gray"
                        leftIcon={<IconInfoCircle size="1.2rem" />}
                        onClick={() => setInfoOpened(true)}
                    >
                        Spécifications techniques
                    </Button>
                </Box>

                <Group mb="md" align="flex-start">
                    <Stack spacing="xs">
                        <Text size="sm" weight={500}>Pochette de l'Album</Text>
                        <FileButton onChange={setAlbumCover} accept="image/*">
                            {(props) => (
                                <Box
                                    {...props}
                                    sx={(theme) => ({
                                        width: 120,
                                        height: 90,
                                        borderRadius: theme.radius.md,
                                        border: `2px dashed ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        '&:hover': {
                                            borderColor: theme.colors.blue[5]
                                        }
                                    })}
                                >
                                    {coverUrl ? (
                                        <Image src={coverUrl} alt="Cover" fit="cover" />
                                    ) : (
                                        <IconPhoto size="2rem" color="gray" />
                                    )}
                                </Box>
                            )}
                        </FileButton>
                    </Stack>
                    <Stack sx={{ flex: 1 }}>
                        <TextInput
                            label="Titre de l'Album"
                            placeholder="Ex: Mes Chansons Préférées"
                            value={albumTitle}
                            onChange={(e) => setAlbumTitle(e.currentTarget.value)}
                        />
                        <TextInput
                            label="Artiste"
                            placeholder="Ex: Henri Dès"
                            value={albumArtist}
                            onChange={(e) => setAlbumArtist(e.currentTarget.value)}
                        />
                    </Stack>
                </Group>

                <Divider my="lg" label={
                    <Group spacing="xs">
                        <Text>Structure de l'Album (Noeuds)</Text>
                        {tracks.some(t => t.validationErrors && t.validationErrors.length > 0) && (
                            <Button size="compact-xs" variant="light" color="orange" leftIcon={<IconAlertCircle size="0.8rem" />} onClick={handleReworkAll}>
                                Tout corriger
                            </Button>
                        )}
                    </Group>
                } labelPosition="center" />

                <Box sx={{ overflowX: 'auto', pb: 'sm' }}>
                    <Group noWrap spacing="xl" align="flex-start" py="md">
                        {/* Entry Node */}
                        <Stack align="center" spacing="xs" sx={{ minWidth: 150 }}>
                            <Box sx={(theme) => ({
                                p: 'sm',
                                border: `2px solid ${theme.colors.blue[6]}`,
                                borderRadius: 'md',
                                background: theme.fn.rgba(theme.colors.blue[9], 0.1),
                                position: 'relative'
                            })}>
                                <Text size="xs" weight={700} color="blue">MENU ENTRÉE</Text>
                                <IconPhoto size="2rem" />
                                <Box sx={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                                    <IconChevronRight color="#228be6" />
                                </Box>
                            </Box>
                            <Text size="xs" color="dimmed">Déclenchement OK</Text>
                        </Stack>

                        <IconArrowRight size="1.2rem" color="gray" style={{ marginTop: 25 }} />

                        {/* Choice Node */}
                        <Stack align="center" spacing="xs" sx={{ minWidth: 150 }}>
                            <Box sx={(theme) => ({
                                p: 'sm',
                                border: `2px solid ${theme.colors.yellow[6]}`,
                                borderRadius: 'md',
                                background: theme.fn.rgba(theme.colors.yellow[9], 0.1),
                                position: 'relative'
                            })}>
                                <Text size="xs" weight={700} color="yellow">CHOIX PISTES</Text>
                                <IconMusic size="2rem" />
                                <Box sx={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                                    <IconChevronRight color="#fab005" />
                                </Box>
                            </Box>
                            <Text size="xs" color="dimmed">{tracks.length} options</Text>
                        </Stack>

                        <IconArrowRight size="1.2rem" color="gray" style={{ marginTop: 25 }} />

                        {/* Track Nodes */}
                        {tracks.map((track, i) => (
                            <Group
                                key={i}
                                noWrap
                                spacing="xs"
                                draggable
                                onDragStart={(e) => handleDragStart(e, i)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, i)}
                                sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
                            >
                                <Stack align="center" spacing="xs" sx={{ minWidth: 200 }}>
                                    <Box sx={(theme) => ({
                                        p: 'sm',
                                        border: `2px solid ${track.validationErrors?.length ? theme.colors.orange[6] : theme.colors.green[6]}`,
                                        borderRadius: 'md',
                                        background: theme.fn.rgba(track.validationErrors?.length ? theme.colors.orange[9] : theme.colors.green[9], 0.1),
                                        position: 'relative',
                                        width: '100%'
                                    })}>
                                        <Group spacing="xs" mb={4} noWrap>
                                            <FileButton onChange={(f) => handleTrackImageChange(i, f)} accept="image/*">
                                                {(props) => (
                                                    <Box {...props} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
                                                        <TrackImagePreview file={track.image} fallbackUrl={coverUrl} />
                                                    </Box>
                                                )}
                                            </FileButton>
                                            <TextInput
                                                size="xs"
                                                variant="unstyled"
                                                styles={{ input: { height: 'auto', minHeight: 0, padding: 0, fontWeight: 700, fontSize: 10 } }}
                                                value={track.title}
                                                onChange={(e) => handleTrackTitleChange(i, e.currentTarget.value)}
                                                sx={{ flex: 1 }}
                                            />
                                        </Group>

                                        <Group spacing={4} noWrap>
                                            <Text size="xs" color="dimmed" sx={{ whiteSpace: 'nowrap', fontSize: 10 }}>
                                                {track.reworking ? "Traitement..." : (track.validationErrors?.length ? "Non conforme" : "Prêt")}
                                            </Text>
                                            {track.validationErrors?.length && !track.reworking && (
                                                <ActionIcon size="xs" color="orange" onClick={() => handleReworkTrack(i)}>
                                                    <IconAlertCircle size="0.8rem" />
                                                </ActionIcon>
                                            )}
                                        </Group>
                                        <Box sx={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                                            <IconChevronRight color={track.validationErrors?.length ? "#fd7e14" : "#40c057"} />
                                        </Box>
                                        <ActionIcon
                                            size="xs"
                                            color="red"
                                            variant="subtle"
                                            sx={{ position: 'absolute', top: -8, right: -8, background: 'black', borderRadius: '50%' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTracks(tracks.filter((_, index) => index !== i));
                                            }}
                                        >
                                            <IconTrash size="0.8rem" />
                                        </ActionIcon>
                                    </Box>
                                    <Text size="xs" color="dimmed">
                                        {i === tracks.length - 1 ? "Retour Menu" : "Suivant"}
                                    </Text>
                                </Stack>
                                {i < tracks.length - 1 && <IconArrowRight size="1.2rem" color="gray" style={{ marginTop: 25 }} />}
                            </Group>
                        ))}

                        <FileButton onChange={handleAddFiles} accept="audio/*" multiple>
                            {(props) => (
                                <Box
                                    {...props}
                                    sx={(theme) => ({
                                        width: 160,
                                        height: 80,
                                        borderRadius: 'md',
                                        border: `2px dashed ${theme.colors.dark[4]}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        '&:hover': { background: theme.fn.rgba(theme.colors.gray[8], 0.1) }
                                    })}
                                >
                                    <IconPlus size="1.5rem" color="gray" />
                                    <Text size="xs" color="dimmed">Ajouter pistes</Text>
                                </Box>
                            )}
                        </FileButton>
                    </Group>
                </Box>

                {tracks.length === 0 && (
                    <Center py="xl">
                        <Stack spacing="xs" align="center">
                            <IconMusic size="3rem" color="gray" style={{ opacity: 0.3 }} />
                            <Text color="dimmed">Glissez vos fichiers MP3 ou cliquez sur "Ajouter pistes"</Text>
                        </Stack>
                    </Center>
                )}

                <Group position="right" mt="xl">
                    <Button
                        size="lg"
                        leftIcon={<IconDeviceFloppy size="1.2rem" />}
                        disabled={tracks.length === 0}
                        loading={installing}
                        onClick={handleInstall}
                        className="gradient-button"
                    >
                        Installer sur la Lunii
                    </Button>
                </Group>

                {installing && (
                    <Stack mt="xl" spacing="xs">
                        <Group position="apart">
                            <Text size="sm" weight={600}>Étape: {installationState.step}</Text>
                            <Text size="xs" color="dimmed">{installationState.audioFileGenerationProgress.doneCount} / {installationState.audioFileGenerationProgress.totalCount}</Text>
                        </Group>
                        <Progress
                            value={installationState.audioFileGenerationProgress.totalCount > 0
                                ? (installationState.audioFileGenerationProgress.doneCount / installationState.audioFileGenerationProgress.totalCount) * 100
                                : 0}
                            animate
                            radius="xl"
                            size="sm"
                        />
                    </Stack>
                )}
            </Paper>

            <Modal
                opened={infoOpened}
                onClose={() => setInfoOpened(false)}
                title={<Group spacing="xs"><IconInfoCircle size="1.2rem" color="#228be6" /><Text weight={700}>Spécifications Techniques Lunii</Text></Group>}
                size="lg"
                centered
                withinPortal
                styles={(theme) => ({
                    inner: { background: 'rgba(20, 20, 20, 0.4)', backdropFilter: 'blur(10px)' },
                    content: { background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : 'white' }
                })}
            >
                <Stack spacing="md">
                    <Box>
                        <Title order={5} color="blue" mb={5}>Images</Title>
                        <Text size="sm">Les ressources image doivent respecter les critères suivants :</Text>
                        <Stack spacing={4} mt="xs">
                            <Text size="xs">• Formats supportés : **BMP (24-bits)**, **PNG*** (sans canal alpha), **JPEG***</Text>
                            <Text size="xs">• Dimensions : **320x240**</Text>
                            <Text size="xs" italic color="dimmed">
                                * Convertis automatiquement lors du transfert.
                                Les couleurs peuvent varier selon l'écran (ex: édition de Noël).
                            </Text>
                        </Stack>
                    </Box>

                    <Divider variant="dashed" />

                    <Box>
                        <Title order={5} color="blue" mb={5}>Audio</Title>
                        <Text size="sm">Les ressources audio doivent respecter les critères suivants :</Text>
                        <Stack spacing={4} mt="xs">
                            <Text size="xs">• Formats supportés : **WAVE (16-bits signés, mono, 32000 Hz)**, **MP3***, **OGG/Vorbis***</Text>
                            <Text size="xs">• Silence : Court "blanc" (~400ms sons courts, quelques secondes histoires) en début et fin.</Text>
                            <Text size="xs">• Volume : Pics autour de **-3dB**, moyenne RMS autour de **-20dB**.</Text>
                        </Stack>
                    </Box>

                    <Box p="sm" sx={(theme) => ({ background: theme.fn.rgba(theme.colors.blue[9], 0.1), borderRadius: 'md', border: `1px solid ${theme.colors.blue[8]}44` })}>
                        <Group spacing="xs" noWrap>
                            <IconAlertCircle size="1.2rem" color="#228be6" />
                            <Text size="xs" weight={500}>Lunii Admin proposera automatiquement de retravailler vos fichiers s'ils ne sont pas conformes.</Text>
                        </Group>
                    </Box>
                </Stack>
            </Modal>
        </Stack>
    );
};
