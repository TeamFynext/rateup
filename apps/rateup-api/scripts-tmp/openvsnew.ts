import { filterChats } from "../src/modules/whatsapp/inbox/message/wamessage.service.js";
const orgId = "437ff0ae-6270-4bf6-9bd5-929639114cd9";
const userId = "2d8f7a94-8da0-43e9-8106-500bca54fccc";
const actor: any = {
  orgId,
  userId,
  scope: { all: true, teamIds: [], inbox: "all" },
  can: () => true,
};
const base = {
  strictFilter: false,
  searchTerm: "",
  blockedUsers: false,
  assignedTeams: [],
  phone: "",
  labels: [],
  conversationTags: [],
  lifecycle: "",
  sortBy: "newest",
  assignedUserIds: [],
};
const open = { ...base, messageType: "usermessages", status: ["ASSIGNED", "UNASSIGNED"] };
const nw = { ...base, messageType: "usermessages", status: [], waMessageAssignStatus: "New" };
for (const [n, f] of [
  ["open", open],
  ["new", nw],
] as const) {
  const rows: any = await filterChats(orgId, 1, f as any, userId, actor);
  console.log(
    n,
    (rows ?? []).map((r: any) => `${r.ticketNumber}:${r.conversationStatus}`),
  );
}
process.exit(0);
