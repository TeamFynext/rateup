import { Stack, Text, Group, Avatar } from "@mantine/core";
import { useUser } from "../../../context/UserContext";

const LoggedInUserCard = () => {
  const { user } = useUser();

  return (
    <Group gap={10} style={{ width: "200px" }}>
      <Avatar
        src={
          user?.orgLogo && user?.orgLogo !== "REMOVED_PHOTO"
            ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user.profilePhoto}`
            : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`
        }
        alt={user.userName}
        radius="xl"
        style={{ size: "40px", marginLeft: "1rem" }}
      />
      <Stack style={{ gap: 0 }}>
        <Text size="lg" fw={500}>
          {user.userName ? user.userName : user.email}
        </Text>
        <Text c="dimmed" size="sm">
          {user.role}
        </Text>
      </Stack>
    </Group>
  );
};
export default LoggedInUserCard;
