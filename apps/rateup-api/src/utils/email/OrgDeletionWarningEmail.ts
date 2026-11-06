import {
  renderOrgDeletionReminderEmail,
  renderOrgInactivityWarningEmail,
} from "./react/templates.js";

export function createInactivityWarningTemplate({
  orgName,
  ownerName,
  deadlineDate,
}: {
  orgName: string;
  ownerName: string;
  deadlineDate: string | number | Date;
}) {
  return renderOrgInactivityWarningEmail({
    orgName,
    ownerName,
    deadline: new Date(deadlineDate).toDateString(),
  });
}

export function createOrgDeletionReminderTemplate({
  orgName,
  ownerName,
  triggeredDate,
  orgId,
}: {
  orgName: string;
  ownerName: string;
  triggeredDate: string | number | Date;
  orgId: string;
}) {
  return renderOrgDeletionReminderEmail({
    orgName,
    ownerName,
    flaggedOn: new Date(triggeredDate).toDateString(),
    orgId,
  });
}
