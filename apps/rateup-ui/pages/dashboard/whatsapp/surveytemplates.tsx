import React from "react";

import { Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import Heading from "../../../components/styled/Heading/Heading";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";

const Templates = () => {
  const { user } = useUser();
  const translations = useTranslations();
  const openCreateBlank = () => {
    //do create blank
  };

  return (
    <Group gap="md" justify="space-between">
      <Heading
        title={translations("WhatsApp Survey Templates")}
        titleprops={{ w: "fit-content" }}
      />
      {user?.role !== UserRole.MEMBER && (
        <RateupButtonBlue
          rightIcon={<IconPlus />}
          title={translations("Start Blank")}
          onClick={openCreateBlank}
        />
      )}
    </Group>
  );
};

export default Templates;
