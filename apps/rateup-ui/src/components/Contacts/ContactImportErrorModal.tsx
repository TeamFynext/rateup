import { ScrollAreaAutosize, Table } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import FormModalLayout from "../Modal/FormModalLayout.tsx";

const ContactImportErrorModal = ({ isError = false, body }) => {
  const responseError = body?.error ?? "";
  const failedRows: { name?: string; phone?: string }[] = Array.isArray(body?.data)
    ? body.data
    : [];
  const [opened, { open, close }] = useDisclosure(false);
  const { t: translations } = useTranslation();

  useEffect(() => {
    if (isError && failedRows.length > 0) {
      open();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, failedRows.length]);

  if (!opened) return null;

  const rows = failedRows.map((element, index) => (
    <Table.Tr key={`${element?.name}-${element?.phone}-${index}`}>
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
      {responseError === "VALIDATION_ERR" && (
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
