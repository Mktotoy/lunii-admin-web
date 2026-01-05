import { ActionIcon, Breadcrumbs, Center, Group, Loader, Paper, ScrollArea, Stack, Table, Text, ThemeIcon, Title, Badge } from "@mantine/core";
import { IconChevronRight, IconFile, IconFolder, IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { state } from "../../store";

interface FileEntry {
    name: string;
    kind: "file" | "directory";
    size?: number;
    handle: FileSystemHandle;
}

export const Explorer = () => {
    const luniiHandle = state.luniiHandle.use();
    const [currentHandle, setCurrentHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [path, setPath] = useState<string[]>(() => {
        const saved = localStorage.getItem("explorer_last_path");
        return saved ? JSON.parse(saved) : [];
    });
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem("explorer_last_path", JSON.stringify(path));
    }, [path]);

    // Initial load and path restoration
    useEffect(() => {
        const restorePath = async () => {
            if (!luniiHandle) return;
            setLoading(true);

            try {
                if (path.length === 0 || path[0] !== luniiHandle.name) {
                    setCurrentHandle(luniiHandle);
                    setPath([luniiHandle.name]);
                } else {
                    let navHandle: FileSystemDirectoryHandle = luniiHandle;
                    const resolvedPath: string[] = [luniiHandle.name];

                    for (let i = 1; i < path.length; i++) {
                        try {
                            const subHandle = await navHandle.getDirectoryHandle(path[i]);
                            navHandle = subHandle;
                            resolvedPath.push(subHandle.name);
                        } catch {
                            break; // Stop at the last valid segment
                        }
                    }
                    setCurrentHandle(navHandle);
                    setPath(resolvedPath);
                }
            } catch (e) {
                console.error("Failed to restore path", e);
                setCurrentHandle(luniiHandle);
                setPath([luniiHandle.name]);
            } finally {
                setLoading(false);
            }
        };
        restorePath();
    }, [luniiHandle]);

    // Load directory entries whenever currentHandle changes
    useEffect(() => {
        const loadEntries = async () => {
            if (!currentHandle) return;
            setLoading(true);
            const items: FileEntry[] = [];
            try {
                for await (const entry of currentHandle.values()) {
                    let size: number | undefined;
                    if (entry.kind === "file") {
                        const file = await (entry as FileSystemFileHandle).getFile();
                        size = file.size;
                    }
                    items.push({
                        name: entry.name,
                        kind: entry.kind,
                        size,
                        handle: entry
                    });
                }
                setEntries(items.sort((a, b) => {
                    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
                    return a.name.localeCompare(b.name);
                }));
            } catch (e) {
                console.error("Failed to load entries", e);
            } finally {
                setLoading(false);
            }
        };
        loadEntries();
    }, [currentHandle]);

    const navigateTo = async (handle: FileSystemHandle) => {
        if (handle.kind === "directory") {
            const dirHandle = handle as FileSystemDirectoryHandle;
            setCurrentHandle(dirHandle);
            setPath(prev => [...prev, dirHandle.name]);
        }
    };

    const handleBreadcrumbClick = async (index: number) => {
        if (!luniiHandle) return;
        let navHandle: FileSystemDirectoryHandle = luniiHandle;
        const newPath = [luniiHandle.name];

        for (let i = 1; i <= index; i++) {
            navHandle = await navHandle.getDirectoryHandle(path[i]);
            newPath.push(path[i]);
        }
        setCurrentHandle(navHandle);
        setPath(newPath);
    };

    const formatSize = (bytes?: number) => {
        if (bytes === undefined) return "-";
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    if (!luniiHandle) {
        return (
            <Center h="100%">
                <Stack align="center" spacing="xs">
                    <Title order={3}>Explorateur de fichiers</Title>
                    <Text color="dimmed">Veuillez connecter votre Lunii pour explorer le contenu</Text>
                </Stack>
            </Center>
        );
    }

    return (
        <Stack h="calc(100vh - 120px)">
            <Group position="apart">
                <Stack spacing={0}>
                    <Title order={2}>Explorateur</Title>
                    <Breadcrumbs separator={<IconChevronRight size="0.8rem" />} mt="xs">
                        {path.map((p, i) => (
                            <Text
                                key={i}
                                size="sm"
                                color={i === path.length - 1 ? "blue" : "dimmed"}
                                weight={i === path.length - 1 ? 700 : 400}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleBreadcrumbClick(i)}
                            >
                                {p}
                            </Text>
                        ))}
                    </Breadcrumbs>
                </Stack>
                <Badge variant="light" size="lg" color="blue">D: Périphérique USB</Badge>
            </Group>

            <Paper withBorder radius="md" p="md" className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <ScrollArea style={{ flex: 1 }}>
                    {loading ? (
                        <Center h={200}><Loader /></Center>
                    ) : (
                        <Table verticalSpacing="sm" highlightOnHover>
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Type</th>
                                    <th>Taille</th>
                                    <th style={{ width: 80 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {path.length > 1 && (
                                    <tr onClick={() => handleBreadcrumbClick(path.length - 2)} style={{ cursor: 'pointer' }}>
                                        <td>
                                            <Group spacing="sm">
                                                <IconArrowLeft size="1.2rem" />
                                                <Text weight={600}>..</Text>
                                            </Group>
                                        </td>
                                        <td>Dossier parent</td>
                                        <td>-</td>
                                        <td></td>
                                    </tr>
                                )}
                                {entries.map((entry) => (
                                    <tr
                                        key={entry.name}
                                        style={{ cursor: entry.kind === 'directory' ? 'pointer' : 'default' }}
                                        onClick={() => entry.kind === 'directory' && navigateTo(entry.handle)}
                                    >
                                        <td>
                                            <Group spacing="sm">
                                                <ThemeIcon color={entry.kind === "directory" ? "blue" : "gray"} variant="light">
                                                    {entry.kind === "directory" ? <IconFolder size="1.2rem" /> : <IconFile size="1.2rem" />}
                                                </ThemeIcon>
                                                <Text weight={500}>{entry.name}</Text>
                                            </Group>
                                        </td>
                                        <td>{entry.kind === "directory" ? "Dossier" : "Fichier"}</td>
                                        <td>{formatSize(entry.size)}</td>
                                        <td>
                                            {entry.kind === "file" && (
                                                <ActionIcon variant="light" color="blue">
                                                    <IconExternalLink size="1rem" />
                                                </ActionIcon>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </ScrollArea>
            </Paper>
        </Stack>
    );
};
