import React, { FC, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
(window as any).Buffer = Buffer;
import App from "./App.tsx";

import { enableReactUse } from "@legendapp/state/config/enableReactUse";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "react-query";
import { Notifications } from "@mantine/notifications";
import { state } from "./store.ts";
import BetaBadge from "./components/BetaTag.tsx";
import { initPostHog } from "./posthog.ts";
import "./styles.css";
import "./builder/i18n/i18n";

enableReactUse();
initPostHog();

const queryClient = new QueryClient();

const WithMantine: FC<{ children: ReactNode }> = ({ children }) => {
  const colorScheme = state.colorScheme.use();
  return (
    <MantineProvider
      theme={{
        colorScheme,
        primaryColor: 'aqua',
        colors: {
          aqua: [
            '#e6fafa', '#cdf5f5', '#9ce9e9', '#6adddd', '#49d3d3', '#2bc9c9', '#22a0a0', '#1a7878', '#115050', '#092828'
          ],
          yellow: [
            '#fff8e6', '#fff1cc', '#fee499', '#fdd666', '#febf51', '#fea13b', '#e68a2e', '#cc7424', '#99561a', '#663911'
          ]
        },
        defaultRadius: 'md',
        fontFamily: 'Outfit, sans-serif',
      }}
      withCSSVariables
      withGlobalStyles
    >
      <ModalsProvider>
        <Notifications />
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WithMantine>
        <BetaBadge />
        <App />
      </WithMantine>
    </QueryClientProvider>
  </React.StrictMode>
);
