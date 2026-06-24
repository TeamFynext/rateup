import { Badge, Blockquote, Button, Group, Mark, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconInfoTriangleFilled, IconPlus, IconRefresh } from "@tabler/icons-react";
import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useUpdateOrgDetailsMutation } from "@/backend/org/org.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";
import { ContainedPasswordInput } from "@/components/input/ContainedInput/ContainedInput.tsx";
import SimpleModalLayout from "@/components/Modal/SimpleModalLayout.tsx";
import { useUser } from "@/context/UserContext.tsx";
import {
  decryptPrivateKey,
  encryptPrivateKey,
  generateKeyPair,
  passwordToKey,
} from "@/utils/encryption/index.ts";

import styles from "../setting.module.css";

// page of end to end encryption settings in advanced settings section of the dashboard
export default function ETESettings() {
  const searchParams = useSearch({ strict: false });
  const { t: translations } = useTranslation();
  const highlighted = !!searchParams.highlighted === true;
  const { user } = useUser();
  const orgDetailsUpdate = useUpdateOrgDetailsMutation();
  const [eteModalOpened, { open: openEteModal, close: closeEteModal }] = useDisclosure(false);
  const [encryptionpassword, setEncryptionPassword] = useState("");
  const triggerEndtoEndEncryptionUpdate = (encryptionpassword: string) => {
    generateKeyPair().then(({ privateKey, publicKey }) => {
      const { keyPassword } = passwordToKey(encryptionpassword);
      encryptPrivateKey(privateKey, keyPassword).then(({ nonceWithEncryptedPrivateKey }) => {
        orgDetailsUpdate.mutate({
          encryptionKeys: {
            publicKey: publicKey,
            privateKey: nonceWithEncryptedPrivateKey,
          },
        });
        sessionStorage.clear();
        toast.success(translations("End to end encryption enabled"));
        closeEteModal();
      });
    });
  };
  // operations for resetting the password
  const [
    passwordResetModalOpened,
    { open: openPasswordResetModal, close: closePasswordResetModal },
  ] = useDisclosure(false);
  const passwordResetForm = useForm({
    initialValues: {
      oldPassword: "",
      newPassword: "",
    },
  });
  const onPasswordResetSubmit = async (values) => {
    toast.loading(translations("Hold.. your password is getting modified..."), {
      id: "reset-encryption-password",
    });
    const { privateKey } = await decryptPrivateKey(
      user?.encryptionKeys?.privateKey,
      values["oldPassword"],
    );
    if (!privateKey) {
      passwordResetForm.setErrors({
        oldPassword: translations("The old password is incorrect"),
      });
    } else {
      if (values["oldPassword"] === values["newPassword"]) {
        passwordResetForm.setErrors({
          newPassword: translations("The new password should be different from the old password"),
        });
        return;
      } else {
        const { keyPassword } = passwordToKey(values["newPassword"]);
        const { nonceWithEncryptedPrivateKey } = await encryptPrivateKey(privateKey, keyPassword);
        orgDetailsUpdate.mutate(
          {
            encryptionKeys: {
              ...user?.encryptionKeys,
              privateKey: nonceWithEncryptedPrivateKey,
            },
          },
          {
            onSuccess: () => {
              sessionStorage.clear();
              toast.success(translations("Password reset successful"));
              closePasswordResetModal();
            },
          },
        );
      }
    }
  };
  return (
    <>
      {/* Modal for generating keypair operation */}
      <SimpleModalLayout
        centered
        opened={eteModalOpened}
        onClose={closeEteModal}
        title={translations("Enter the password")}
      >
        <Stack>
          <Text>{translations("Enter the password to enable end to end encryption")}</Text>
          <Blockquote
            p={"sm"}
            color="yellow"
            icon={<IconInfoTriangleFilled size={18} />}
            iconSize={18}
          >
            <Text size="sm">
              {translations(
                " Note: You are required to enter this password to view the results of any end-to-end encrypted survey.",
              )}
              <Mark px={5} bg={"white"} c={"red"} fw={"800"}>
                {translations("Password is not recoverable")}
              </Mark>
            </Text>
          </Blockquote>
          <ContainedPasswordInput
            label={translations("Password")}
            value={encryptionpassword}
            onChange={(e) => setEncryptionPassword(e.target.value)}
          />
          <RateupButtonBlue
            loading={orgDetailsUpdate.isPending}
            title={translations("Submit")}
            onClick={() => triggerEndtoEndEncryptionUpdate(encryptionpassword)}
          />
        </Stack>
      </SimpleModalLayout>
      {/* Modal for password reset operation */}
      <SimpleModalLayout
        centered
        opened={passwordResetModalOpened}
        onClose={closePasswordResetModal}
        title={translations("Reset Your Password")}
      >
        <form onSubmit={passwordResetForm.onSubmit((values) => onPasswordResetSubmit(values))}>
          <Stack>
            <ContainedPasswordInput
              label={translations("Old Password")}
              {...passwordResetForm.getInputProps("oldPassword")}
            />
            <ContainedPasswordInput
              label={translations("New Password")}
              {...passwordResetForm.getInputProps("newPassword")}
            />
            <RateupButtonBlue
              loading={orgDetailsUpdate.isPending}
              title={translations("Submit")}
              type={"submit"}
              onClick={() => triggerEndtoEndEncryptionUpdate(encryptionpassword)}
            />
          </Stack>
        </form>
      </SimpleModalLayout>
      {/* Settings display component */}
      <Stack className={highlighted && styles["blink"]}>
        <Group>
          <Text size="lg" fw={500}>
            {translations("End-to-End Encryption")}
          </Text>
          <Badge color={user?.encryptionKeys ? "green" : "red"} fw={"bold"} variant="light">
            {user?.encryptionKeys ? "Active" : "Inactive"}
          </Badge>
        </Group>
        <Text size="sm" c={"var(--tertiary-color)"}>
          {translations("Generate Key Pairs for End To End Encryption Here")}
        </Text>
        <Group>
          <Button rightSection={<IconPlus />} radius={"xl"} onClick={openEteModal}>
            {translations("Generate Key Pair")}
          </Button>
          <Button
            rightSection={<IconRefresh />}
            radius={"xl"}
            color="red"
            disabled={!user?.encryptionKeys}
            onClick={openPasswordResetModal}
          >
            {translations("Reset Password")}
          </Button>
        </Group>
      </Stack>
    </>
  );
}
