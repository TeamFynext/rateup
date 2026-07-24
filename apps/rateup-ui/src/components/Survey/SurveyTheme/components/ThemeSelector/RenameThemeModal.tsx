import { useCallback, useEffect, useState } from "react";

import { useRenameSurveyThemeMutation } from "@/backend/surveyTheme/surveyTheme.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

const NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_\s]{5,}$/;

function RenameThemeModal({ opened, onClose, themeId, oldName }) {
  const [name, setName] = useState(oldName);
  const [error, setError] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const { mutateAsync: renameThemeMutationAsync } = useRenameSurveyThemeMutation();

  useEffect(() => {
    if (!opened) {
      setName(oldName);
      setError("");
    }
  }, [opened, oldName]);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!NAME_REGEX.test(name)) {
        setError(
          "Name should be alphanumeric, should start with a letter, length should be greater than 5 characters",
        );
        return;
      }
      if (!name || !themeId) return;
      setIsRenaming(true);
      try {
        await renameThemeMutationAsync({ surveyThemeId: themeId, body: { name } });
        onClose();
      } catch (err) {
        console.log(err);
      } finally {
        setIsRenaming(false);
      }
    },
    [name, themeId],
  );

  return (
    <Dialog
      open={opened}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Theme</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit}>
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="rename-theme-input">Theme Name</FieldLabel>
              <Input
                id="rename-theme-input"
                placeholder="Enter New Theme Name"
                aria-invalid={!!error}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isRenaming}>
              {isRenaming ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RenameThemeModal;
