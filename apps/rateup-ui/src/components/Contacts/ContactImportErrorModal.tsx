import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useDisclosure } from "@/hooks/useDisclosure";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog.tsx";
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
    <Dialog
      open={opened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-225">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-semibold">
            {translations("Failed contact import")}
          </DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(ContactImportErrorModal);
