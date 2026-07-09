import { useDisclosure } from "@mantine/hooks";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import FormModalLayout from "../Modal/FormModalLayout.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.tsx";

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
    <TableRow key={`${element?.name}-${element?.phone}-${index}`}>
      <TableCell>{element?.name}</TableCell>
      <TableCell>{element?.phone}</TableCell>
    </TableRow>
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
        <ScrollArea className="max-h-125">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translations("Name")}</TableHead>
                <TableHead>{translations("Phone")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{rows}</TableBody>
          </Table>
        </ScrollArea>
      )}
    </FormModalLayout>
  );
};

export default React.memo(ContactImportErrorModal);
