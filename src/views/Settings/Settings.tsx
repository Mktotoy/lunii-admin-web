import { Title, Text, Stack, Paper, Switch, Select, Divider } from "@mantine/core";
import { state, switchColorScheme } from "../../store";

export const Settings = () => {
    const colorScheme = state.colorScheme.use();

    return (
        <Stack>
            <Title order={1}>Paramètres</Title>

            <Paper p="xl" radius="md" withBorder className="glass">
                <Stack>
                    <div>
                        <Text weight={500}>Interface</Text>
                        <Divider my="sm" />
                    </div>

                    <Switch
                        label="Mode Sombre"
                        checked={colorScheme === "dark"}
                        onChange={switchColorScheme}
                    />

                    <Select
                        label="Langue"
                        defaultValue="fr"
                        data={[
                            { value: 'fr', label: 'Français' },
                            { value: 'en', label: 'English' },
                        ]}
                    />
                </Stack>
            </Paper>

            <Paper p="xl" radius="md" withBorder className="glass">
                <Stack>
                    <div>
                        <Text weight={500}>Système</Text>
                        <Divider my="sm" />
                    </div>
                    <Text size="sm" color="dimmed">Version de l'application: 3.0.0-PRO</Text>
                    <Text size="sm" color="dimmed">Version de bibliothèque: Mantine v6.0.17</Text>
                </Stack>
            </Paper>
        </Stack>
    );
};
