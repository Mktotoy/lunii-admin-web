import { Title, Text, Stack, Paper, Group, ActionIcon, Button, SimpleGrid, Badge, Divider, Modal, TextInput, Textarea, Center } from "@mantine/core";
import { IconPlus, IconExternalLink, IconTrash, IconFolder, IconDeviceFloppy, IconSearch } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { state$, State, defaultState } from "../../builder/store/store";
import { deepCopy } from "../../builder/utils/misc";
import { notifications } from "@mantine/notifications";

interface StudioProject {
    uuid: string;
    title: string;
    author: string;
    description: string;
    lastModified: number;
    state: State;
}

export const ProjectManager = () => {
    const [projects, setProjects] = useState<StudioProject[]>([]);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newProject, setNewProject] = useState({ title: '', author: '', description: '' });

    // Currently we use stateV4 in localStorage. 
    // To support multiple projects, we will manage them in an index.
    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = () => {
        const projectsRaw = localStorage.getItem("studio_projects");
        if (projectsRaw) {
            setProjects(JSON.parse(projectsRaw));
        } else {
            // Migrate current state to initial project if none exist
            const currentState = state$.state.get();
            const initialProject: StudioProject = {
                uuid: crypto.randomUUID(),
                title: currentState.metadata.title || "Projet sans nom",
                author: currentState.metadata.author || "Anonyme",
                description: currentState.metadata.description || "",
                lastModified: Date.now(),
                state: currentState
            };
            const projectsList = [initialProject];
            localStorage.setItem("studio_projects", JSON.stringify(projectsList));
            setProjects(projectsList);
        }
    };


    const createProject = () => {
        const id = crypto.randomUUID();
        const state = deepCopy(defaultState);
        state.metadata = { ...newProject };

        const project: StudioProject = {
            uuid: id,
            ...newProject,
            lastModified: Date.now(),
            state
        };

        const updatedList = [...projects, project];
        localStorage.setItem("studio_projects", JSON.stringify(updatedList));
        setProjects(updatedList);
        loadProject(project);
        setCreateModalOpen(false);
    };

    const loadProject = (project: StudioProject) => {
        state$.state.set(project.state);
        localStorage.setItem("current_project_id", project.uuid);
        // Notify StudioView that project changed if needed
    };

    const deleteProject = (uuid: string) => {
        const updatedList = projects.filter(p => p.uuid !== uuid);
        localStorage.setItem("studio_projects", JSON.stringify(updatedList));
        setProjects(updatedList);
    };

    const scanLegacyProjects = () => {
        const legacyProjects: StudioProject[] = [];
        const keys = ["state", "stateV1", "stateV2", "stateV3", "stateV4"];

        keys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    // Check if it looks like a story state
                    if (parsed.metadata && parsed.nodeIndex) {
                        const id = crypto.randomUUID();
                        legacyProjects.push({
                            uuid: id,
                            title: parsed.metadata.title || `Ancien Projet (${key})`,
                            author: parsed.metadata.author || "Inconnu",
                            description: parsed.metadata.description || `Récupéré depuis ${key}`,
                            lastModified: Date.now(),
                            state: parsed
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse legacy key", key, e);
                }
            }
        });

        if (legacyProjects.length > 0) {
            const updatedList = [...projects];
            legacyProjects.forEach(lp => {
                if (!updatedList.find(p => p.title === lp.title)) {
                    updatedList.push(lp);
                }
            });
            localStorage.setItem("studio_projects", JSON.stringify(updatedList));
            setProjects(updatedList);
            notifications.show({
                title: "Scan terminé",
                message: `${legacyProjects.length} anciens projets trouvés et ajoutés.`,
                color: "teal"
            });
        } else {
            notifications.show({
                title: "Scan terminé",
                message: "Aucun ancien projet n'a été trouvé.",
                color: "gray"
            });
        }
    };

    return (
        <Stack spacing="xl">
            <Group position="apart">
                <Stack spacing={0}>
                    <Title order={3}>Bibliothèque Studio</Title>
                    <Text size="sm" color="dimmed">Vos histoires non publiées sur l'appareil</Text>
                </Stack>
                <Group>
                    <Button variant="light" leftIcon={<IconSearch size="1rem" />} onClick={scanLegacyProjects}>Récupérer anciens projets</Button>
                    <Button leftIcon={<IconPlus size="1rem" />} onClick={() => setCreateModalOpen(true)}>Nouveau Projet</Button>
                </Group>
            </Group>

            <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
                {projects.map((project) => (
                    <Paper key={project.uuid} p="md" radius="md" withBorder className="glass">
                        <Stack>
                            <Group position="apart">
                                <IconFolder size="2rem" color="blue" stroke={1.5} />
                                <Badge variant="light">{new Date(project.lastModified).toLocaleDateString()}</Badge>
                            </Group>
                            <div>
                                <Text weight={700} lineClamp={1}>{project.title || "Sans Titre"}</Text>
                                <Text size="xs" color="dimmed">Par {project.author || "Olup"}</Text>
                            </div>
                            <Divider />
                            <Group grow>
                                <Button size="xs" variant="light" leftIcon={<IconExternalLink size="0.8rem" />} onClick={() => loadProject(project)}>Ouvrir</Button>
                                <ActionIcon color="red" variant="subtle" onClick={() => deleteProject(project.uuid)}><IconTrash size="1rem" /></ActionIcon>
                            </Group>
                        </Stack>
                    </Paper>
                ))}
                {projects.length === 0 && (
                    <Paper p="xl" radius="md" withBorder style={{ borderStyle: 'dashed' }}>
                        <Center style={{ flexDirection: 'column' }}>
                            <Text color="dimmed">Aucun projet en cours</Text>
                            <Button variant="subtle" compact onClick={() => setCreateModalOpen(true)}>Créer le premier</Button>
                        </Center>
                    </Paper>
                )}
            </SimpleGrid>

            <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Nouveau Projet Studio" centered radius="md">
                <Stack>
                    <TextInput label="Titre de l'histoire" placeholder="Ex: Les Aventures de Léo" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} />
                    <TextInput label="Auteur" placeholder="Votre nom" value={newProject.author} onChange={(e) => setNewProject({ ...newProject, author: e.target.value })} />
                    <Textarea label="Description" placeholder="Une brève description..." value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} />
                    <Button fullWidth onClick={createProject} leftIcon={<IconDeviceFloppy size="1rem" />}>Créer le projet</Button>
                </Stack>
            </Modal>
        </Stack>
    );
};
