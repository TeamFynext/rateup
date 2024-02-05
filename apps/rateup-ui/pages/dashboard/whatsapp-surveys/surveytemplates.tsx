import { Group } from "@mantine/core";
import React from "react";

import { IconPlus } from "@tabler/icons-react";
import Heading from "../../../components/styled/Heading/Heading";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";

const Templates = () => {
  const { user } = useUser();

  const openCreateBlank = () => {
    //do create blank
  };

  return (
    <Group gap="md" justify="space-between">
      <Heading
        title={"WhatsApp Survey Templates"}
        titleprops={{ w: "fit-content" }}
      />
      {user?.role !== UserRole.MEMBER && (
        <RateupButtonBlue
          rightIcon={<IconPlus />}
          title="Start Blank"
          onClick={openCreateBlank}
        />
      )}
    </Group>
  );
};

export default Templates;
