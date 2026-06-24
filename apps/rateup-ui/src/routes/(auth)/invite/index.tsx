import {
  Center,
  Container,
  Flex,
  Image,
  Loader,
  NavLink,
  Paper,
  Space,
  Stack,
  Text,
} from "@mantine/core";
import { IconArrowAutofitLeft } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { signOut } from "supertokens-auth-react/recipe/session";

import { completeInvite } from "@/backend/team/team.api";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";
import { rateupLogoUrl } from "@/components/HomePage/constants.tsx";

import styles from "../../../components/(auth)/invite/styles.module.css";

export const Route = createFileRoute("/(auth)/invite/")({
  component: Invite,
});

function Invite() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchParams = useSearch({ strict: false });
  const type = searchParams.type;
  const token = searchParams.token;

  const { t: translations } = useTranslation();
  let title = "";
  if (type === "team") title = "Team";
  else if (type === "org") title = "Organization";

  const acceptInvite = async () => {
    const inviteToken = token.toString();
    await signOut();
    return completeInvite(inviteToken);
  };

  const updateInviteMutation = useMutation({
    mutationFn: () => acceptInvite(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] }); // update team list on add
      toast.success(translations("Invite Accepted successfully."), {
        id: "load-data",
      });
    },

    onError: (error: Error) => {
      console.error("Error:", error.message);
      toast.error(error.message, {
        id: "load-data",
      });
    },
  });

  useEffect(() => {
    if (type === "team" && token) {
      toast.loading(translations("Hold on, while validating your invite."), {
        id: "load-data",
      });
      setTimeout(() => {
        !updateInviteMutation.data && updateInviteMutation.mutate();
      }, 2000);
    }
    // TODO : improve with org invite
  }, [type, token]);

  useEffect(() => {}, [updateInviteMutation.error]);

  return (
    <Stack align="center">
      <Image src="/images/bg-shape.svg" w={"100%"} pos={"fixed"} bottom={0} alt="bg of a shape" />
      <Paper
        shadow="md"
        p={30}
        mt={70}
        radius="md"
        w={350}
        mih={600}
        pos={"relative"}
        style={{
          boxShadow: "0px -4px 12px 0px #0000001F",
          zIndex: 999,
        }}
      >
        <Center>
          <Link to="/">
            <Image src={rateupLogoUrl} alt="RateUp Logo" w={140} />
          </Link>
        </Center>
        <Flex gap="md" justify="center" align="center" direction="column" wrap="wrap">
          <Space h="lg" />
          <Text mb="lg" fz={24} style={{ color: "var(--tertiary-color)" }} fw={600}>
            {title} {translations("Invitation")}
          </Text>

          {!type || !token ? (
            <Container>{translations("Invite is not valid.")}</Container>
          ) : (
            <Container>
              {updateInviteMutation?.isPending || !updateInviteMutation.data ? (
                type === "team" && token ? (
                  <Loader type="bars" />
                ) : (
                  "Error"
                )
              ) : (
                <Flex gap="md" justify="center" align="center" direction="column" wrap="wrap">
                  <Text c="green"> {updateInviteMutation.data?.data.message}</Text>
                  <div className="wrapper">
                    <svg
                      className={styles.checkmark}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 52 52"
                    >
                      <circle
                        className={styles.checkmark__circle}
                        cx="26"
                        cy="26"
                        r="25"
                        fill="none"
                      />
                      <path
                        className={styles.checkmark__check}
                        fill="none"
                        d="M14.1 27.2l7.1 7.2 16.7-16.8"
                      />
                    </svg>
                  </div>
                  <Space h="xl" />

                  <Text ta={"center"}>
                    {updateInviteMutation.data?.data.data.isUser
                      ? translations(
                          "Login to your existing account in this email and continue using the app.",
                        )
                      : translations(
                          "Your account is ready, Create a new password and login to start using the app.",
                        )}
                  </Text>

                  {updateInviteMutation.data?.data.data.isUser ? (
                    <RateupButtonPrimary
                      onClick={() => {
                        navigate({
                          to: "/login",
                        });
                      }}
                      title={translations("Continue")}
                    />
                  ) : (
                    <RateupButtonPrimary
                      onClick={() => {
                        navigate({
                          to: `${updateInviteMutation.data?.data.data.redirectLink}&type=invite`,
                        });
                      }}
                      title={translations("Continue")}
                    />
                  )}
                </Flex>
              )}
            </Container>
          )}

          {updateInviteMutation.error && (
            <Stack>
              <Text>{translations("Failed..! Try another invitation.")}</Text>

              <Space h="xl" />
              <Space h="xl" />
              <Space h="xl" />
              <Space h="xl" />

              <Center>
                <Text inline c="blue.6" style={{ textDecoration: "none" }} className={styles.txt}>
                  <Link to="/login" style={{ textDecoration: "none" }}>
                    <NavLink
                      label={translations("Go to Login")}
                      leftSection={<IconArrowAutofitLeft size="1rem" stroke={1.5} />}
                      variant="subtle"
                    />
                  </Link>
                </Text>
              </Center>
            </Stack>
          )}
        </Flex>
      </Paper>
    </Stack>
  );
}
