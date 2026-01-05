import { Button, Group, Space, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconDownload,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import { FC } from "react";
import { useMutation } from "react-query";
import { resetState, state$ } from "../store/store";
import { exportPack, showFilePicker } from "../utils/fs";
import { importPack } from "../utils/import/importPack";
import { LanguageSelector } from "./LanguageSelector.tsx";
import { Trans, useTranslation } from "react-i18next";

export const Header: FC = () => {
  const { t } = useTranslation();

  const openResetModal = () =>
    modals.openConfirmModal({
      title: <Text weight={700}>{t('newPack.modal.title')}</Text>,
      centered: true,
      children: (
        <Text size="sm">
          {t("newPack.modal.children.text")}
        </Text>
      ),
      labels: { confirm: t("newPack.modal.labels.confirm"), cancel: t("newPack.modal.labels.cancel") },
      confirmProps: { color: "blue", radius: "md" },
      onConfirm: () => resetState(),
    });

  const { mutate: doImportPack, isLoading } = useMutation(
    async () => {
      const file = await showFilePicker([
        { accept: { "application/zip": [".zip"] } },
      ]);
      if (!file) return;
      const state = await importPack(file);
      state$.state.assign(state);
    },
    {
      onError: (e) => {
        notifications.show({
          color: "red",
          title: t("common.error.unknown"),
          message: (e as Error).message,
        });
      },
    }
  );

  const openImportModal = () =>
    modals.openConfirmModal({
      title: <Text weight={700}><Trans key={"components.Header.import.modal.title"}></Trans></Text>,
      centered: true,
      children: (
        <Stack spacing="xs">
          <Text size="sm">
            {t("components.Header.import.modal.children.0")}
          </Text>
          <Text size="sm" color="dimmed">
            {t("components.Header.import.modal.children.1")}
          </Text>
          <Text size="sm" weight={500}>
            {t("components.Header.import.modal.children.2")}
          </Text>
        </Stack>
      ),
      labels: {
        confirm: t("components.Header.import.labels.confirm"),
        cancel: t("components.Header.import.labels.cancel")
      },
      confirmProps: { color: "blue", radius: "md" },
      onConfirm: () => doImportPack(),
    });

  return (
    <Group p="xs" className="glass" style={{ borderRadius: 16, display: 'inline-flex' }}>
      <Button
        variant="light"
        leftIcon={<IconPlus size={18} />}
        onClick={() => openResetModal()}
      >
        {t('newPack.button.text')}
      </Button>
      <Button
        variant="light"
        leftIcon={<IconUpload size={18} />}
        onClick={() => openImportModal()}
        loading={isLoading}
      >
        {t('components.Header.import.button')}
      </Button>
      <Button
        variant="filled"
        color="blue"
        leftIcon={<IconDownload size={18} />}
        onClick={async () => {
          try {
            await exportPack(state$.state.peek());
          } catch (e) {
            console.error(e);
            notifications.show({
              title: t("common.error.unknown"),
              message: (e as Error).message,
              color: "red",
            });
          }
        }}
      >
        {t('components.Header.build.button')}
      </Button>
      <Space w="xs" />
      <LanguageSelector />
    </Group>
  );
};
