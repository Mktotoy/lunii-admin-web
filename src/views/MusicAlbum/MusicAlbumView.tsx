import { Container, Title, Text, Stack } from "@mantine/core";
import { MusicAlbumTool } from "../../components/MusicAlbumTool";

export const MusicAlbumView = () => {
    return (
        <Container size="xl">
            <Stack spacing="xl">
                <div>
                    <Title order={1}>Albums Musique</Title>
                    <Text color="dimmed">Créez des packs d'albums à partir de vos fichiers MP3</Text>
                </div>
                <MusicAlbumTool />
            </Stack>
        </Container>
    );
};
