"use client";

import { useState } from "react";

import { IconDownload, IconInfoCircle } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { useCreateMenuItemUsingCsvMutation } from "../../../backend/menu/item/mItem.query";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Spinner } from "../../ui/spinner";
import { DropZoneArea } from "./dropZone/DropZone";

const CategoryItemCsvModal = ({ opened, close, menuId }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const createMenuItemUsingCsv = useCreateMenuItemUsingCsvMutation(
    menuId,
    () => {
      close();
      setCsvFile(null);
    },
  );
  const translations = useExtracted();
  const handleCsvFileUpload = () => {
    if (!csvFile) return;
    const formData = new FormData();
    formData.append("menuId", menuId);
    formData.append("file", csvFile);
    createMenuItemUsingCsv.mutate(formData);
  };

  const isPending = createMenuItemUsingCsv.isPending;

  return (
    <Dialog open={opened} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="sm:max-w-155">
        <DialogHeader>
          <DialogTitle>{translations("Import Menu from CSV file")}</DialogTitle>
          <DialogDescription>
            {translations("Upload a CSV to create menu items in bulk.")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCsvFileUpload();
          }}
          className="relative"
        >
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
              <Spinner />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Alert>
              <IconInfoCircle data-icon="inline-start" />
              <AlertTitle>{translations("CSV format requirements")}</AlertTitle>
              <AlertDescription>
                {translations(
                  "Utilizing CSV file uploads to generate menu items requires specific fields in the file:",
                )}{" "}
                &quot;{translations("categoryname")}&quot;, &quot;
                {translations("name")}&quot;, &quot;
                {translations("description")}
                &quot;, {translations("and")} &quot;{translations("price")}
                &quot;.
              </AlertDescription>
            </Alert>

            <a
              href={getFileUrlFromKey("/File/menu/Demo.csv", false)}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex w-fit"
            >
              <Button type="button" variant="outline">
                <IconDownload data-icon="inline-start" />
                {translations("Download Demo Csv File")}
              </Button>
            </a>

            <DropZoneArea setCsvFile={setCsvFile} />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={close}>
              {translations("Cancel")}
            </Button>
            <Button type="submit" disabled={!csvFile || isPending}>
              {translations("Upload Csv")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryItemCsvModal;
