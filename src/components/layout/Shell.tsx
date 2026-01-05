import {
    AppShell,
    Navbar,
    Header,
    Text,
    MediaQuery,
    Burger,
    useMantineTheme,
    NavLink,
    Stack,
    Group,
    ActionIcon,
    Badge,
    Progress,
    Divider,
    Paper,
    Button,
    Avatar,
} from "@mantine/core";
import {
    IconDeviceDesktop,
    IconHammer,
    IconFolder,
    IconSettings,
    IconMoon,
    IconSun,
    IconBrandGithub,
    IconDisc,
    IconCheck,
} from "@tabler/icons-react";
import { useState } from "react";
import { getDeviceInfo } from "../../utils/lunii/deviceInfo";
import { state, switchColorScheme } from "../../store";
import { getLuniiHandle } from "../../utils";

export const Shell = ({ children }: { children: React.ReactNode }) => {
    const theme = useMantineTheme();
    const [opened, setOpened] = useState(false);
    const currentTab = state.currentTab.use();
    const colorScheme = state.colorScheme.use();
    const device = state.device.use();

    const navLinks = [
        { icon: IconDeviceDesktop, label: "Mon Appareil", value: "dashboard" },
        { icon: IconDisc, label: "Albums Musique", value: "music_album" },
        { icon: IconHammer, label: "Studio Créatif", value: "studio" },
        { icon: IconFolder, label: "Explorateur", value: "explorer" },
        { icon: IconSettings, label: "Paramètres", value: "settings" },
    ];

    return (
        <AppShell
            styles={{
                main: {
                    background:
                        colorScheme === "dark"
                            ? theme.colors.dark[8]
                            : theme.colors.gray[0],
                    transition: "background-color 200ms ease",
                },
            }}
            navbarOffsetBreakpoint="sm"
            asideOffsetBreakpoint="sm"
            navbar={
                <Navbar
                    p="md"
                    hiddenBreakpoint="sm"
                    hidden={!opened}
                    width={{ sm: 250, lg: 300 }}
                    className="glass"
                    style={{ borderRight: "1px solid rgba(255,255,255,0.1)" }}
                >
                    <Navbar.Section grow>
                        <Stack spacing="xs">
                            {navLinks.map((link) => (
                                <NavLink
                                    key={link.value}
                                    active={currentTab === link.value}
                                    label={link.label}
                                    icon={<link.icon size="1.2rem" stroke={1.5} />}
                                    onClick={() => {
                                        state.currentTab.set(link.value as any);
                                        setOpened(false);
                                    }}
                                    variant="light"
                                    sx={(theme) => ({
                                        borderRadius: theme.radius.md,
                                        "&[data-active]": {
                                            backgroundColor: theme.fn.rgba(theme.colors.blue[6], 0.1),
                                        },
                                    })}
                                />
                            ))}
                        </Stack>
                    </Navbar.Section>

                    <Navbar.Section>
                        <Stack spacing="sm" pt="md" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            {device ? (
                                <Paper p="xs" radius="sm" withBorder className="glass" sx={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <Stack spacing={5}>
                                        <Group position="apart">
                                            <Text size="xs" weight={700} color="aqua">APPAREIL CONNECTÉ</Text>
                                            <IconCheck size="10" color="#49d3d3" />
                                        </Group>
                                        <Progress color="aqua" size="xs" value={15} radius="xl" />
                                        <Text size="10px" color="dimmed" align="right">~800 MB Libres</Text>
                                    </Stack>
                                </Paper>
                            ) : (
                                <Paper p="xs" radius="sm" withBorder sx={{ borderStyle: 'dashed', background: 'transparent' }}>
                                    <Stack spacing={5} align="center">
                                        <Text size="xs" weight={600} color="dimmed">AUCUN APPAREIL</Text>
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            compact
                                            onClick={async () => {
                                                const handle = await getLuniiHandle();
                                                if (handle) {
                                                    const info = await getDeviceInfo(handle);
                                                    state.device.set(info);
                                                    state.luniiHandle.set(handle);
                                                }
                                            }}
                                            color="yellow"
                                        >
                                            Connecter
                                        </Button>
                                    </Stack>
                                </Paper>
                            )}

                            <Divider />
                            <Group position="apart">
                                <Group spacing="sm">
                                    <Avatar src={null} radius="xl" color="yellow">TB</Avatar>
                                    <div style={{ flex: 1 }}>
                                        <Text size="sm" weight={500}>Thomas B.</Text>
                                        <Text size="xs" color="dimmed">Version PRO</Text>
                                    </div>
                                </Group>
                            </Group>

                            <Group position="apart">
                                <Text size="xs" color="dimmed">Apparence</Text>
                                <ActionIcon variant="light" size="sm" onClick={switchColorScheme}>
                                    {colorScheme === "dark" ? <IconSun size="14" /> : <IconMoon size="14" color="#49d3d3" />}
                                </ActionIcon>
                            </Group>
                            <Group position="apart">
                                <Text size="xs" color="dimmed">Version</Text>
                                <Badge variant="dot" size="xs" color="yellow">v3.0.0-PRO</Badge>
                            </Group>
                        </Stack>
                    </Navbar.Section>
                </Navbar>
            }
            header={
                <Header height={{ base: 60 }} p="md" className="glass" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", height: "100%", justifyContent: "space-between" }}>
                        <MediaQuery largerThan="sm" styles={{ display: "none" }}>
                            <Burger
                                opened={opened}
                                onClick={() => setOpened((o) => !o)}
                                size="sm"
                                color={theme.colors.gray[6]}
                                mr="xl"
                            />
                        </MediaQuery>

                        <Group>
                            <Text weight={800} size="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 45 }}>
                                LUNII ADMIN PRO
                            </Text>
                        </Group>

                        <Group spacing="xs">
                            <ActionIcon
                                variant="light"
                                size="md"
                                component="a"
                                href="https://github.com/olup/lunii-admin-web"
                                target="_blank"
                            >
                                <IconBrandGithub size="1.2rem" />
                            </ActionIcon>
                        </Group>
                    </div>
                </Header>
            }
        >
            <div style={{ padding: '1rem' }}>
                {children}
            </div>
        </AppShell>
    );
};
