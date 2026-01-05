import { Alert, Button, Center, Container, Text, Title, Stack, Box, Group } from "@mantine/core";
import { getLuniiHandle } from "../utils";
import { getDeviceInfo } from "../utils/lunii/deviceInfo";
import { state } from "../store";
import { IconFolderOpen, IconHeartFilled, IconAward } from "@tabler/icons-react";

export const UnconnectedApp = () => {
  return (
    <Container size="sm" h="90vh">
      <Center h="100%">
        <Box className="glass" p={40} style={{ textAlign: 'center', width: '100%' }}>
          <Stack spacing="xl" align="center">
            <Title order={1} size={42} style={{ letterSpacing: -2 }}>
              LUNII<span style={{ color: 'var(--accent-color)' }}>ADMIN</span>
            </Title>

            <Text size="lg" opacity={0.8} style={{ maxWidth: 400 }}>
              Pour commencer l'aventure, autorisez votre navigateur à accéder à votre Lunii.
            </Text>

            <Button
              size="xl"
              radius="md"
              leftIcon={<IconFolderOpen size="1.2rem" />}
              onClick={async () => {
                const handle = await getLuniiHandle();
                if (!handle) return;
                const device = await getDeviceInfo(handle);
                await state.device.set(device);
                await state.luniiHandle.set(handle);
              }}
              style={{ paddingLeft: 40, paddingRight: 40 }}
            >
              Ouvrir ma Lunii
            </Button>

            <Alert color="blue" variant="light" radius="md" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Stack spacing="xs">
                <Text size="sm" weight={600}>Crée par Mktotoy sur reprise des projet de Olup</Text>
              </Stack>
            </Alert>
          </Stack>
        </Box>
      </Center>
    </Container>
  );
};
