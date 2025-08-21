import { Avatar, Group, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

import { getUserRoleLabel } from "@/utils";

import { useUser } from "../../../context/UserContext";

const LoggedInUserCard = () => {
  const { user } = useUser();
  const translations = useTranslations();

  if (!user) return null;
  return (
    <Group gap={10} style={{ width: "100%" }}>
      <Avatar
        src={
          user?.orgLogo && user?.orgLogo !== "REMOVED_PHOTO"
            ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.profilePhoto}`
            : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`
        }
        alt={user?.userName}
        radius="lg"
        style={{ size: "40px" }}
      />
      <Stack style={{ gap: 0, flex: 1 }}>
        <Text size="sm" fw={500} w={100} truncate>
          {user?.userName ? user?.userName : user?.email}
        </Text>
        <Text c="dimmed" size="xs">
          {getUserRoleLabel(user?.role, translations)}
        </Text>
      </Stack>
    </Group>
  );
};
export default LoggedInUserCard;
