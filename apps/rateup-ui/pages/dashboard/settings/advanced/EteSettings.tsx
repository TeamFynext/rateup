import { useSearchParams } from "next/navigation";
import { useUser } from "../../../../context/UserContext";
import { useState } from "react";
import { useUpdateOrgDetailsMutation } from "../../../../backend/org/org.query";
import { useDisclosure } from "@mantine/hooks";
import {
  decryptPrivateKey,
  encryptPrivateKey,
  generateKeyPair,
  passwordToKey,
} from "../../../../utils/encryption";
import {
  showLoadingToast,
  showSuccessToast,
} from "../../../../utils/notifications";
import { useForm } from "@mantine/form";
import SimpleModalLayout from "../../../../components/Modal/SimpleModalLayout";
import {
  Badge,
  Blockquote,
  Button,
  Group,
  Mark,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconInfoTriangleFilled,
  IconPlus,
  IconRefresh,
} from "@tabler/icons-react";
import { ContainedPasswordInput } from "../../../../components/input/ContainedInput/ContainedInput";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import styles from "../setting.module.css";

export default function ETESettings() {
  const searchParams = useSearchParams();
  const highlighted = !!searchParams.get("highlighted") === true;
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const orgDetailsUpdate = useUpdateOrgDetailsMutation(setIsLoading);
  const [eteModalOpened, { open: openEteModal, close: closeEteModal }] =
    useDisclosure(false);
  const [encryptionpassword, setEncryptionPassword] = useState("");
  const triggerEndtoEndEncryptionUpdate = (encryptionpassword: string) => {
    generateKeyPair().then(({ privateKey, publicKey }) => {
      const { keyPassword } = passwordToKey(encryptionpassword);
      encryptPrivateKey(privateKey, keyPassword).then(
        ({ nonceWithEncryptedPrivateKey }) => {
          orgDetailsUpdate.mutate({
            encryptionKeys: {
              publicKey: publicKey,
              privateKey: nonceWithEncryptedPrivateKey,
            },
          });
          sessionStorage.clear();
          showSuccessToast("End to end encryption enabled");
          closeEteModal();
        },
      );
    });
  };
  //operations for resetting the password
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
    showLoadingToast(
      "Hold.. your password is getting modified...",
      "reset-encryption-password",
      true,
      "Resetting Password",
    );
    const { privateKey } = await decryptPrivateKey(
      user?.encryptionKeys?.privateKey,
      values["oldPassword"],
    );
    if (!privateKey) {
      passwordResetForm.setErrors({
        oldPassword: "The old password is incorrect",
      });
    } else {
      if (values["oldPassword"] === values["newPassword"]) {
        passwordResetForm.setErrors({
          newPassword:
            "The new password should be different from the old password",
        });
        return;
      } else {
        const { keyPassword } = passwordToKey(values["newPassword"]);
        const { nonceWithEncryptedPrivateKey } = await encryptPrivateKey(
          privateKey,
          keyPassword,
        );
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
              showSuccessToast("Password reset successful");
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
        title="Enter the password"
      >
        <Stack>
          <Text>Enter the password to enable end to end encryption</Text>
          <Blockquote
            p={"sm"}
            color="yellow"
            icon={<IconInfoTriangleFilled size={18} />}
            iconSize={18}
          >
            <Text size="sm">
              Note: You are required to enter this password to view the results
              of any end-to-end encrypted survey. This
              <Mark px={5} bg={"white"} c={"red"} fw={"800"}>
                Password is not recoverable
              </Mark>
            </Text>
          </Blockquote>
          <ContainedPasswordInput
            label="Password"
            value={encryptionpassword}
            onChange={(e) => setEncryptionPassword(e.target.value)}
          />
          <RateupButtonBlue
            loading={isLoading}
            title="Submit"
            onClick={() => triggerEndtoEndEncryptionUpdate(encryptionpassword)}
          />
        </Stack>
      </SimpleModalLayout>
      {/* Modal for password reset operation */}
      <SimpleModalLayout
        centered
        opened={passwordResetModalOpened}
        onClose={closePasswordResetModal}
        title="Reset Your Password"
      >
        <form
          onSubmit={passwordResetForm.onSubmit((values) =>
            onPasswordResetSubmit(values),
          )}
        >
          <Stack>
            <ContainedPasswordInput
              label="Old Password"
              {...passwordResetForm.getInputProps("oldPassword")}
            />
            <ContainedPasswordInput
              label="New Password"
              {...passwordResetForm.getInputProps("newPassword")}
            />
            <RateupButtonBlue
              loading={isLoading}
              title="Submit"
              type={"submit"}
              onClick={() =>
                triggerEndtoEndEncryptionUpdate(encryptionpassword)
              }
            />
          </Stack>
        </form>
      </SimpleModalLayout>
      {/* Settings display component */}
      <Stack className={highlighted && styles["blink"]}>
        <Group>
          <Text size="lg" fw={500}>
            End-to-End Encryption
          </Text>
          <Badge
            color={user?.encryptionKeys ? "green" : "red"}
            fw={"bold"}
            variant="light"
          >
            {user?.encryptionKeys ? "Active" : "Inactive"}
          </Badge>
        </Group>
        <Text size="sm" c={"var(--tertiary-color)"}>
          Generate Key Pairs for End To End Encryption Here
        </Text>
        <Group>
          <Button
            rightSection={<IconPlus />}
            radius={"xl"}
            onClick={openEteModal}
          >
            Generate Key Pair
          </Button>
          <Button
            rightSection={<IconRefresh />}
            radius={"xl"}
            color="red"
            disabled={!user?.encryptionKeys}
            onClick={openPasswordResetModal}
          >
            Reset Password
          </Button>
        </Group>
      </Stack>
    </>
  );
}
