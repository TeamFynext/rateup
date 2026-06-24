import { ScrollAreaAutosize, Table } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import FormModalLayout from "../Modal/FormModalLayout.tsx";

const ContactImportErrorModal = ({ isError = false, body }) => {
  const { error, data } = body ?? { error: "", data: "" };
  const [opened, { toggle, close }] = useDisclosure(false);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (isError && data?.length > 0) {
      toggle();
    }
  }, [isError]);
  if (!opened) return;

  const rows =
    isError &&
    data?.map((element: { name?: string; phone?: string }) => (
      <Table.Tr key={element.name}>
        <Table.Td>{element?.name}</Table.Td>
        <Table.Td>{element?.phone}</Table.Td>
      </Table.Tr>
    ));

  return (
    <FormModalLayout
      centered
      opened={opened}
      onClose={close}
      title={translations("Failed contact import")}
      size={"xl"}
    >
      {isError && error === "VALIDATION_ERR" && (
        <ScrollAreaAutosize mah={500}>
          <Table stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{translations("Name")}</Table.Th>
                <Table.Th>{translations("Phone")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </ScrollAreaAutosize>
      )}
    </FormModalLayout>
  );
};

export default React.memo(ContactImportErrorModal);
