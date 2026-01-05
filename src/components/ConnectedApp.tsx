import { Center, Container, Loader, Text, Stack } from "@mantine/core";
import { useGetPacksQuery, useReorderPackMutation } from "../queries";
import { state } from "../store";
import { Header } from "./Header";
import { InstallModal } from "./InstallModal";
import { Pack } from "./Pack";
import { PackShell } from "../utils/lunii/packs";

export const ConnectedApp = () => {
  const isFfmpegLoaded = state.isFfmpegLoaded.use();

  const { data: packList } = useGetPacksQuery();
  const { mutate: movePack } = useReorderPackMutation();

  if (!isFfmpegLoaded)
    return (
      <Center h={400} style={{ flexDirection: "column" }}>
        <Text mb={20} weight={500}>Chargement de l'environnement créatif...</Text>
        <Loader variant="dots" size="xl" />
      </Center>
    );

  return (
    <>
      <Container size="md">
        <Header />
        <Stack spacing="lg">
          {packList?.map((pack: PackShell, i: number) => (
            <Pack
              key={pack.uuid}
              pack={pack}
              index={i}
              onReorder={(from, to) => movePack({ from, to })}
            />
          ))}
        </Stack>

        {packList?.length === 0 && (
          <Center h={200}>
            <Text opacity={0.5}>Aucun pack trouvé sur votre Lunii.</Text>
          </Center>
        )}
      </Container>
      <InstallModal />
    </>
  );
};
