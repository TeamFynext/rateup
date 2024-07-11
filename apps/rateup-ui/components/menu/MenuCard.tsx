import { Badge, Box, Flex, Group, Stack, Text } from "@mantine/core";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getTimeSince } from "../../utils";
import CreatedSinceText from "../DateAndTime/CreatedSinceText";
import PaperLayout from "../styled/Layouts/PaperLayout";
import MenuCardMenu from "./MenuCardMenu";
import { currencyLabel } from "./util/currencyData";

export function MenuCard({
  menu,
  handleEditClick,
}: {
  readonly menu: Menu;
  readonly handleEditClick: (menu: Menu) => void;
}): JSX.Element {
  const [timeSince, setTimeSince] = useState("");

  const router = useRouter();
  useEffect(() => {
    setTimeSince(getTimeSince(menu.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(menu.createdAt)),
      5000,
    );
    return () => clearInterval(timeoutID);
  }, [menu?.createdAt]);

  return (
    <PaperLayout
      hoveractive={true}
      onClick={() => {
        router.push(`/dashboard/menu/${menu.id}`);
      }}
    >
      <Stack>
        <Box>
          <Flex justify={"space-between"} align={"center"}>
            <Text mr={"sm"} truncate fz="lg" fw={700} tt={"capitalize"}>
              {menu.name}
            </Text>
            <MenuCardMenu
              handleEditClick={handleEditClick}
              menuId={menu.id}
              teamId={menu.teamId}
              menu={menu}
            />
          </Flex>
          <Text size="md" lineClamp={1}>
            {menu.displayName}
          </Text>
        </Box>

        <CreatedSinceText createdAt={menu?.createdAt} />

        <Group>
          {menu?.team?.code && (
            <Badge variant="light" color="green">
              {menu?.team?.code}
            </Badge>
          )}
          {menu?.currency && (
            <Badge variant="light">
              {
                currencyLabel.find((data) => data.value === menu?.currency)
                  .label
              }
            </Badge>
          )}
        </Group>
      </Stack>
    </PaperLayout>
  );
}
