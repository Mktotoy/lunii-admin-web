import { Alert, Box, Center, Code, Text, Title, Stack, Container } from "@mantine/core";
import { useUserAgent } from "@oieduardorabelo/use-user-agent";
import { IconAlertCircle } from "@tabler/icons-react";

export const UnavailableApp = () => {
  const details = useUserAgent();
  return (
    <Container size="sm" h="90vh">
      <Center h="100%">
        <Box className="glass" p={40} style={{ width: '100%', textAlign: 'center' }}>
          <Stack spacing="xl">
            <IconAlertCircle size="4rem" color="orange" style={{ margin: '0 auto' }} />
            <Title order={2}>Navigateur non compatible</Title>
            <Text opacity={0.8}>
              Désolé, votre navigateur actuel ne supporte pas l'accès direct aux fichiers requis pour Lunii Admin.
            </Text>
            <Text weight={500}>
              Veuillez utiliser la dernière version de Chrome, Edge, Brave ou Opera sur ordinateur.
            </Text>

            {details?.browser?.name === "Chrome" && (
              <Alert mt={20} color="orange" variant="light" radius="md" style={{ textAlign: 'left' }}>
                <Text weight={700} mb="xs">Note pour les utilisateurs de Brave :</Text>
                <Text size="sm">
                  Activez le flag <b>Filesystem Access Api</b> pour faire fonctionner l'application :
                </Text>
                <Box component="ul" mt="xs">
                  <li>Allez sur <Code>brave://flags/#file-system-access-api</Code></li>
                  <li>Passez l'option sur <b>Enabled</b></li>
                  <li>Redémarrez votre navigateur</li>
                </Box>
              </Alert>
            )}
          </Stack>
        </Box>
      </Center>
    </Container>
  );
};
