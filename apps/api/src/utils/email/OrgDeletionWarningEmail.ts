import {
  renderOrgDeletionReminderEmail,
  renderOrgInactivityWarningEmail,
} from "./react/templates.js";

export function createInactivityWarningTemplate({
  orgName,
  ownerName,
  deadlineDate,
  idleFor,
}: {
  orgName: string;
  ownerName: string;
  deadlineDate: string | number | Date;
  idleFor?: string;
}) {
  return renderOrgInactivityWarningEmail({
    orgName,
    ownerName,
    idleFor,
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
