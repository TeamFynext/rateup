import { renderTeamInviteEmail } from "../react/templates.js";

export function createEmailBody(
  invite_link: string,
  _email_id: string,
  context?: { orgName?: string; teamName?: string },
) {
  return renderTeamInviteEmail({
    inviteLink: invite_link,
    orgName: context?.orgName,
    teamName: context?.teamName,
  });
}
