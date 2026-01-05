import { ActionIcon, Badge, Button, Flex, Group, Space, Tooltip, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconBrandGithubFilled,
  IconMoon,
  IconRefresh,
  IconSun,
  IconUpload,
  IconDeviceDesktop,
  IconHammer,
} from "@tabler/icons-react";
import { useInstallPack, useSyncMetadataMutation } from "../queries";
import { state, switchColorScheme } from "../store";

export const Header = () => {
  const colorScheme = state.colorScheme.use();
  const currentView = state.currentView.use();
  const device = state.device.peek();

  const doInstallPack = useInstallPack();
  const { mutate: syncMetadata } = useSyncMetadataMutation();

  return (
    <Flex
      px="xl"
      py="md"
      align="center"
      className="glass"
      style={{
        position: 'sticky',
        top: 20,
        zIndex: 100,
        marginBottom: 40,
        marginLeft: -20,
        marginRight: -20
      }}
    >
      <Group spacing="xs">
        <Text weight={700} size="xl" style={{ letterSpacing: -1 }}>
          LUNII<span style={{ color: 'var(--accent-color)' }}>ADMIN</span>
        </Text>
        <Badge variant="dot" color="blue" size="sm">v3</Badge>
      </Group>

      <Space w={40} />

      <Group spacing="sm">
        <Button
          variant={currentView === "manager" ? "filled" : "subtle"}
          leftIcon={<IconDeviceDesktop size="1.2rem" />}
          onClick={() => state.currentView.set("manager")}
          color={currentView === "manager" ? "blue" : "gray"}
        >
          Manager
        </Button>
        <Button
          variant={currentView === "builder" ? "filled" : "subtle"}
          leftIcon={<IconHammer size="1.2rem" />}
          onClick={() => state.currentView.set("builder")}
          color={currentView === "builder" ? "blue" : "gray"}
        >
          Studio
        </Button>
      </Group>

      <Space style={{ flex: 1 }} />

      <Group spacing="md">
        {currentView === "manager" && (
          <Group spacing="xs">
            <Button
              variant="light"
              leftIcon={<IconUpload size="1rem" />}
              onClick={() => doInstallPack()}
            >
              Installer
            </Button>

            <Tooltip label="Synchroniser les métadonnées">
              <ActionIcon
                variant="light"
                color="blue"
                size="lg"
                onClick={() => syncMetadata()}
              >
                <IconRefresh size="1.2rem" />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}

        <Group spacing="xs">
          {device?.version === "V2" && !device?.stable && (
            <ActionIcon variant="light" color="orange" size="lg">
              <IconAlertTriangle size="1.2rem" />
            </ActionIcon>
          )}

          <ActionIcon variant="light" size="lg" onClick={switchColorScheme}>
            {colorScheme === "dark" ? <IconSun size="1.2rem" /> : <IconMoon size="1.2rem" />}
          </ActionIcon>

          <ActionIcon
            variant="light"
            size="lg"
            component="a"
            href="https://github.com/olup/lunii-admin-web"
            target="_blank"
          >
            <IconBrandGithubFilled size="1.2rem" />
          </ActionIcon>
        </Group>
      </Group>
    </Flex>
  );
};
