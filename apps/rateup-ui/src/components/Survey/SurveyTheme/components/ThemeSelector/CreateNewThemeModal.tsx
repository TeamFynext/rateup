import { IconPlus } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateNewThemeMutation } from "@/backend/surveyTheme/surveyTheme.query";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

const NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_\s]{0,}$/;

function CreateNewThemeModal({
  setThemeSelectorState,
  surveyThemeDispatch,
}: {
  setThemeSelectorState: (id: string) => void;
  surveyThemeDispatch: (action: { type: string; payload?: unknown }) => void;
}) {
  const params = useParams({ strict: false });
  const surveyId = params.surveyId as string;
  const { t: translations } = useTranslation();

  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const { mutateAsync: createNewThemeMutationAsync } = useCreateNewThemeMutation(surveyId);

  useEffect(() => {
    if (!opened) {
      setName("");
      setError("");
    }
  }, [opened]);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!NAME_REGEX.test(name)) {
        setError(
          translations(
            "Name should be alphanumeric, should start with a letter, length should be greater than 0 characters",
          ),
        );
        return;
      }
      try {
        const themeData = await createNewThemeMutationAsync({ name, surveyId });
        setThemeSelectorState(themeData.id);
        surveyThemeDispatch({ type: "set-survey-theme", payload: themeData.theme });
        setOpened(false);
      } catch (err) {
        console.log(err);
        setOpened(false);
      }
    },
    [name, surveyId],
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                className="create-theme-btn self-end rounded-full text-xs font-light"
                onClick={() => setOpened(true)}
              >
                {translations("Create Theme")}
                <IconPlus size={"1.25rem"} />
              </Button>
            }
          />
          <TooltipContent>{translations("Create New Theme")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog
        open={opened}
        onOpenChange={(o) => {
          if (!o) setOpened(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations("Create New Theme")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <FieldGroup>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="create-theme-input">{translations("Theme Name")}</FieldLabel>
                <Input
                  id="create-theme-input"
                  placeholder={translations("Enter Theme Name")}
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
              <Button type="button" variant="outline" onClick={() => setOpened(false)}>
                {translations("Cancel")}
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CreateNewThemeModal;
