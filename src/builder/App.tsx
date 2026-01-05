import { Box, Flex, Space, Title } from "@mantine/core";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Header as BuilderHeader } from "./components/Header";
import { MetadataCard } from "./components/MetadataCard";
import { Option } from "./components/Option";
import { state$ } from "./store/store";
import { useTranslation } from "react-i18next";

function App() {
  const initialOptionUuid = state$.state.initialNodeUuid.use();
  const { t } = useTranslation();

  return (
    <Box className="glass" style={{ overflow: "hidden", borderRadius: 24, height: 'calc(100vh - 150px)', position: 'relative' }}>
      <TransformWrapper
        doubleClick={{ disabled: true }}
        panning={{ excluded: ["input", "textarea"] }}
        centerOnInit={false}
        minScale={0.5}
        onZoomStop={({ state: { scale } }: { state: { scale: number } }) => {
          state$.ui.scale.set(scale);
        }}
      >
        <TransformComponent
          wrapperStyle={{
            height: "100%",
            width: "100%",
            cursor: "grab",
          }}
          contentStyle={{
            background: "transparent",
            backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0)",
            backgroundSize: "40px 40px",
            backgroundPosition: "-19px -19px",
            minHeight: "100vh",
            minWidth: "100vw",
            padding: "100px",
            boxSizing: "border-box",
          }}
        >
          <Box id="arrrow-frame" pos="relative">
            <Title size={50} order={1} style={{ opacity: 0.8, marginBottom: 20 }}>
              {t("common.appName")}
            </Title>

            <BuilderHeader />
            <Space h={50} />
            <Flex>
              <Box mr={50}>
                <MetadataCard />
              </Box>
              <Option id={initialOptionUuid} />
            </Flex>
          </Box>
        </TransformComponent>
      </TransformWrapper>
    </Box>
  );
}

export default App;
