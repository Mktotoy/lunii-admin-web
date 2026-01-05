import {
    Title,
    Text,
    Stack,
    Group,
    SimpleGrid,
    Paper,
    ActionIcon,
    Button,
    Divider,
    ScrollArea,
    ThemeIcon,
    Select,
    Center,
    Badge,
    SegmentedControl
} from "@mantine/core";
import {
    IconPlus,
    IconMusic,
    IconEdit,
    IconTrash,
    IconHome,
    IconDeviceFloppy
} from "@tabler/icons-react";
import { NodeType, state$ } from "../../builder/store/store";
import { useState } from "react";
import { AudioSelector, ImageSelector } from "../../builder/components/FileSelector";
import { extractAudioMetadata } from "../../builder/utils/metadata";
import { ProjectManager } from "./ProjectManager";
import { MusicAlbumTool } from "../../components/MusicAlbumTool";

export const StudioView = () => {
    const [view, setView] = useState<"editor" | "library" | "album">("library");
    const initialOptionUuid = state$.state.initialNodeUuid.use();
    const [selectedNodeUuid, setSelectedNodeUuid] = useState(initialOptionUuid);
    const nodeIndex$ = state$.state.nodeIndex;
    const nodes = nodeIndex$.use();

    const selectedNode = nodes[selectedNodeUuid];

    const handleAddNode = (type: "menu" | "story") => {
        const uuid = crypto.randomUUID();
        const newNode: NodeType = {
            uuid,
            type,
            onEnd: "stop",
            ...(type === "menu" ? { menuDetails: { uuid: crypto.randomUUID(), options: [], to: "menu" } } : {})
        };
        nodeIndex$[uuid].set(newNode);
        setSelectedNodeUuid(uuid);
    };

    const handleDeleteNode = (uuid: string) => {
        if (uuid === initialOptionUuid) return;
        nodeIndex$[uuid].delete();
        setSelectedNodeUuid(initialOptionUuid);
    };

    return (
        <Stack h="calc(100vh - 120px)">
            <Group position="apart">
                <Stack spacing={0}>
                    <Title order={2}>Studio Créatif</Title>
                    <Text size="sm" color="dimmed">Concevez vos propres aventures</Text>
                </Stack>
                <Group>
                    <SegmentedControl
                        value={view}
                        onChange={(val: any) => setView(val)}
                        data={[
                            { label: 'Bibliothèque', value: 'library' },
                            { label: 'Éditeur', value: 'editor' },
                            { label: 'Album Musique', value: 'album' },
                        ]}
                    />
                    {view === "editor" && (
                        <>
                            <Button leftIcon={<IconPlus size="1rem" />} variant="light" onClick={() => handleAddNode("menu")}>Étape Menu</Button>
                            <Button leftIcon={<IconMusic size="1rem" />} color="teal" onClick={() => handleAddNode("story")}>Étape Histoire</Button>
                        </>
                    )}
                </Group>
            </Group>

            {view === "library" ? (
                <ProjectManager />
            ) : view === "album" ? (
                <MusicAlbumTool />
            ) : (
                <SimpleGrid cols={2} spacing="xl" breakpoints={[{ maxWidth: 'md', cols: 1 }]} style={{ flex: 1, minHeight: 0 }}>
                    {/* Left panel: Node Tree/List */}
                    <Paper withBorder radius="md" p="md" className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Group position="apart" mb="xs">
                            <Text weight={700}>Arborescence</Text>
                            <Badge variant="filled">{Object.keys(nodes).length} Étapes</Badge>
                        </Group>
                        <Divider mb="md" />
                        <ScrollArea style={{ flex: 1 }}>
                            <Stack spacing="xs">
                                {Object.values(nodes).map((node) => (
                                    <Paper
                                        key={node.uuid}
                                        p="sm"
                                        radius="md"
                                        onClick={() => setSelectedNodeUuid(node.uuid)}
                                        style={{
                                            cursor: 'pointer',
                                            background: selectedNodeUuid === node.uuid ? 'rgba(34, 139, 230, 0.15)' : 'rgba(255,255,255,0.05)',
                                            border: selectedNodeUuid === node.uuid ? '1px solid #228be6' : '1px solid transparent',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Group position="apart">
                                            <Group spacing="sm">
                                                <ThemeIcon color={node.type === "menu" ? "blue" : "teal"} variant="light" radius="md">
                                                    {node.type === "menu" ? <IconPlus size="1rem" /> : <IconMusic size="1rem" />}
                                                </ThemeIcon>
                                                <div>
                                                    <Text size="sm" weight={600}>{node.uuid === initialOptionUuid && <IconHome size="0.8rem" style={{ marginRight: 4 }} />} {node.type === "menu" ? "Menu" : "Histoire"}</Text>
                                                    <Text size="xs" color="dimmed" lineClamp={1}>{node.uuid.substring(0, 8)}</Text>
                                                </div>
                                            </Group>
                                            {node.uuid !== initialOptionUuid && (
                                                <ActionIcon color="red" variant="subtle" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.uuid); }}>
                                                    <IconTrash size="0.8rem" />
                                                </ActionIcon>
                                            )}
                                        </Group>
                                    </Paper>
                                ))}
                            </Stack>
                        </ScrollArea>
                    </Paper>

                    {/* Right panel: Editor */}
                    <Paper withBorder radius="md" p="md" className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {selectedNode ? (
                            <ScrollArea style={{ flex: 1 }}>
                                <Stack>
                                    <Group position="apart">
                                        <Text weight={700}>Propriétés de l'étape</Text>
                                        <Badge color={selectedNode.type === "menu" ? "blue" : "teal"}>{selectedNode.type.toUpperCase()}</Badge>
                                    </Group>
                                    <Divider />

                                    <Stack spacing="lg">
                                        <Stack spacing="xs">
                                            <Text size="sm" weight={600}>Image du nœud</Text>
                                            <ImageSelector
                                                value={selectedNode.imageRef}
                                                onChange={(val) => nodeIndex$[selectedNodeUuid].imageRef.set(val || undefined)}
                                            />
                                        </Stack>

                                        <Stack spacing="xs">
                                            <Text size="sm" weight={600}>Audio du nœud</Text>
                                            <AudioSelector
                                                value={selectedNode.audioRef}
                                                onChange={async (val, originalFile) => {
                                                    nodeIndex$[selectedNodeUuid].audioRef.set(val || undefined);
                                                    if (originalFile) {
                                                        const meta = await extractAudioMetadata(originalFile);
                                                        console.log("Metadata auto-extracted:", meta);
                                                    }
                                                }}
                                            />
                                        </Stack>

                                        {selectedNode.type === "menu" && (
                                            <Stack spacing="xs">
                                                <Text size="sm" weight={600}>Transitions Menu</Text>
                                                <Paper p="sm" withBorder radius="md" style={{ background: 'rgba(0,0,0,0.1)' }}>
                                                    <Center h={60}>
                                                        <Text size="xs" color="dimmed">Configurez les choix de l'utilisateur ici</Text>
                                                    </Center>
                                                </Paper>
                                            </Stack>
                                        )}

                                        {selectedNode.type === "story" && (
                                            <Stack spacing="xs">
                                                <Text size="sm" weight={600}>Action de fin</Text>
                                                <Select
                                                    value={selectedNode.onEnd || "stop"}
                                                    onChange={(val: any) => nodeIndex$[selectedNodeUuid].onEnd.set(val)}
                                                    data={[
                                                        { label: 'Arrêter', value: 'stop' },
                                                        { label: 'Retour au menu', value: 'back' },
                                                        { label: 'Suite automatique', value: 'next' },
                                                    ]}
                                                />
                                            </Stack>
                                        )}
                                    </Stack>
                                </Stack>
                            </ScrollArea>
                        ) : (
                            <Center style={{ flex: 1, flexDirection: 'column' }}>
                                <ThemeIcon size={64} radius={40} variant="light" color="gray" mb="md">
                                    <IconEdit size={32} />
                                </ThemeIcon>
                                <Text color="dimmed">Sélectionnez une étape pour l'éditer</Text>
                            </Center>
                        )}
                        <Divider mt="md" mb="md" />
                        <Button fullWidth leftIcon={<IconDeviceFloppy size="1.2rem" />} size="md">Enregistrer le projet</Button>
                    </Paper>
                </SimpleGrid>
            )}
        </Stack>
    );
};
