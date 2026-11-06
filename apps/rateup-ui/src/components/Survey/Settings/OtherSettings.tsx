import { useNavigate, useParams } from "@tanstack/react-router";
import { useId, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useResetResponsesStats } from "@/backend/surveys/response/response.query";
import { useDeleteSurveyMutation } from "@/backend/surveys/surveys.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import SurveyContext from "@/context/SurveyContext.ts";
import { useUser } from "@/context/UserContext.tsx";

const OtherSettings = () => {
  const uid = useId();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const params = useParams({ strict: false });
  const surveyId = params?.surveyId as string;
  const { surveyTeamMapId } = useContext(SurveyContext);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();
  const { t: translations } = useTranslation();

  const resetResponsesStats = useResetResponsesStats(
    surveyId,
    surveyTeamMapId,
    () => setResetOpen(false),
    setIsLoading,
  );

  useEffect(() => {
    setVerifyEmail("");
  }, [resetOpen]);

  const confirmReset = () => {
    if (user?.email === verifyEmail) {
      toast.loading(translations("Hold on, data is getting reset..."), { id: "load-data" });
      setIsLoading(true);
      resetResponsesStats.mutate();
    } else {
      toast.error(translations("Incorrect email"), { id: "load-data" });
    }
  };

  const deleteSurveyMutation = useDeleteSurveyMutation();

  const confirmDeleteSurvey = () => {
    toast.loading(translations("Hold on, survey is getting deleted..."), { id: "delete-survey" });
    setIsLoading(true);
    deleteSurveyMutation.mutate(surveyId);
    navigate({ to: `/dashboard/surveys` });
  };

  return (
    <>
      <Card
        size="sm"
        className="bg-destructive/[0.03] shadow-none ring-destructive/25 dark:bg-destructive/10"
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-extrabold tracking-wider text-destructive">
              {translations("DANGER ZONE")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {translations("Resetting or deleting removes response data permanently.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setResetOpen(true)}
            >
              {translations("Reset Response data")}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              {translations("Delete Survey")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset responses modal */}
      <Dialog open={resetOpen} onOpenChange={(v) => !isLoading && setResetOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations("Reset Reponses & Stats")}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${uid}-field`}>
                {translations("Verify email")} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id={`${uid}-field`}
                placeholder={translations("Enter your login email")}
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmReset()}
              />
            </Field>
          </FieldGroup>
          <p className="text-sm text-destructive">
            {translations("Once reset, all response data will be lost.")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} loading={isLoading}>
              {translations("Cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmReset} loading={isLoading}>
              {translations("Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete survey modal */}
      <Dialog open={deleteOpen} onOpenChange={(v) => !isLoading && setDeleteOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations("Confirm Delete Survey")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-destructive">
            {translations("Are you sure you want to delete this survey?")}
            <br />
            {translations("This action cannot be undone.!!")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} loading={isLoading}>
              {translations("Cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSurvey} loading={isLoading}>
              {translations("Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OtherSettings;
