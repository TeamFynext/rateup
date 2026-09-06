// Lead-pipeline contracts, as `/api/pipelines` returns and accepts them.
//
// These mirror `rateup-api`'s prisma models (`Pipeline`, `PipelineStage`, `Lead`
// and friends). View-only concerns — derived rotting flags, board grouping —
// live in `@/components/pipeline/pipeline.utils.ts`, not here.

export type LeadStatus = "OPEN" | "WON" | "LOST";

export type LeadSource =
  | "WHATSAPP"
  | "INSTAGRAM"
  | "MESSENGER"
  | "WEBCHAT"
  | "SURVEY"
  | "REFERRAL"
  | "LOYALTY"
  | "MANUAL";

export type LeadChannel = "NONE" | "WHATSAPP" | "INSTAGRAM" | "MESSENGER";

export type LeadTaskType = "CALL" | "MESSAGE" | "MEETING" | "DOCUMENT" | "TODO";

/**
 * What landing in a stage does to a lead. A board's own vocabulary — it no
 * longer borrows the inbox's lifecycle categories.
 */
export type StageStatus = "OPEN" | "WON" | "LOST";

export interface PipelineUser {
  id: string;
  name: string | null;
  profilePhoto: string | null;
}

export interface PipelineTeamRef {
  id: string;
  name: string;
  color: string;
}

export interface PipelineContactRef {
  id: string;
  name: string | null;
  phone: string | null;
}

export interface PipelineStage {
  id: string;
  name: string;
  /** Short label for the drawer's stage stepper; falls back to `name`. */
  short: string | null;
  order: number;
  color: string | null;
  probability: number;
  rottingDays: number;
  /** Won and Lost columns close a lead on arrival and sit out of open counts. */
  status: StageStatus;
  pipelineId: string;
  openLeadCount: number;
}

export interface PipelineLostReason {
  id: string;
  label: string;
  order: number;
  pipelineId: string;
  leadCount: number;
}

export interface PipelineLabel {
  id: string;
  name: string;
  color: string;
  pipelineId: string;
}

/** The pipeline switcher's row — name plus a live open-lead count. */
export interface PipelineSummary {
  id: string;
  name: string;
  description: string | null;
  order: number;
  rottingEnabled: boolean;
  autoAssignEnabled: boolean;
  nudgeEnabled: boolean;
  teamIds: string[];
  openLeadCount: number;
}

/** One pipeline with everything the board chrome needs, but without its leads. */
export interface PipelineDetail extends Omit<PipelineSummary, "openLeadCount"> {
  stages: PipelineStage[];
  lostReasons: PipelineLostReason[];
  labels: PipelineLabel[];
}

/** The subset of a stage embedded in each lead, so cards need no stage lookup. */
export interface LeadStageRef {
  id: string;
  name: string;
  probability: number;
  rottingDays: number;
  status: StageStatus;
}

export interface LeadTask {
  id: string;
  type: LeadTaskType;
  title: string;
  dueAt: string | null;
  completedAt: string | null;
  leadId: string;
  assigneeId: string | null;
}

export interface LeadNote {
  id: string;
  text: string;
  leadId: string;
  authorId: string | null;
  author: PipelineUser | null;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  type: string;
  details: {
    fromStageName?: string;
    toStageName?: string;
    addedNames?: string[];
    removedNames?: string[];
    lostReasonLabel?: string;
    note?: string;
    taskTitle?: string;
    sourceLabel?: string;
    /** The lead was opened by a rule; `user` is then whoever set the rule off. */
    automated?: boolean;
    /** Which CRM a sync entry concerns, e.g. "GetLead". */
    integrationName?: string;
    /** The lead's id in that CRM, on a successful sync. */
    externalId?: string;
    /** True when the CRM record was opened rather than updated. */
    externalCreated?: boolean;
    /** Why a sync did not happen. A stable code, turned into a sentence here. */
    skipReason?: string;
    /** The mapped status was refused; the rest of the lead still synced. */
    statusRejected?: boolean;
  } | null;
  leadId: string;
  userId: string | null;
  user: PipelineUser | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  status: LeadStatus;
  source: LeadSource;
  channel: LeadChannel;
  pipelineId: string;
  stageId: string;
  stage: LeadStageRef;
  teamId: string | null;
  team: PipelineTeamRef | null;
  /** Everyone working this lead; empty means nobody has picked it up. */
  assignees: PipelineUser[];
  ownerId: string | null;
  /** Whoever opened the lead. Fixed at creation; null for automated leads. */
  owner: PipelineUser | null;
  contactId: string | null;
  contact: PipelineContactRef | null;
  lostReasonId: string | null;
  lostReason: { id: string; label: string } | null;
  labels: PipelineLabel[];
  /** Earliest open task; the board card's "next activity" line. */
  nextTask: LeadTask | null;
  stageEnteredAt: string;
  lastActivityAt: string;
  expectedCloseAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A single lead read, which additionally carries its notes and timeline. */
export interface LeadDetail extends Lead {
  notes: LeadNote[];
  activities: LeadActivity[];
}

/** A team and the board its contacts land on, as the lifecycle settings list it. */
export interface TeamPipelineDefault {
  id: string;
  name: string;
  color: string;
  defaultPipelineId: string | null;
  /** Open a lead on that board when a contact reaches a mapped lifecycle. */
  autoCreateLeads: boolean;
}

export interface UpdateTeamDefaultInput {
  defaultPipelineId?: string | null;
  autoCreateLeads?: boolean;
}

// ------------------------------------------------------------------- payloads

export interface CreatePipelineInput {
  name: string;
  description?: string;
  teamIds: string[];
}

export interface UpdatePipelineInput {
  name?: string;
  description?: string | null;
  teamIds?: string[];
  rottingEnabled?: boolean;
  autoAssignEnabled?: boolean;
  nudgeEnabled?: boolean;
}

export interface CreateStageInput {
  pipelineId: string;
  name: string;
  short?: string;
  color?: string;
  probability?: number;
  rottingDays?: number;
  status?: StageStatus;
}

export type UpdateStageInput = Omit<Partial<CreateStageInput>, "pipelineId">;

export interface CreateLeadInput {
  pipelineId: string;
  stageId: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: LeadSource;
  channel?: LeadChannel;
  teamId?: string | null;
  assigneeIds?: string[];
  contactId?: string | null;
  expectedCloseAt?: string | null;
  labelIds?: string[];
}

export type UpdateLeadInput = Omit<Partial<CreateLeadInput>, "pipelineId" | "stageId">;

export interface CloseLeadInput {
  status: Extract<LeadStatus, "WON" | "LOST">;
  /** The closing column the lead was dropped on; omitted when a button closed it. */
  stageId?: string;
  lostReasonId?: string | null;
  note?: string;
}

export interface BulkUpdateLeadsInput {
  leadIds: string[];
  stageId?: string;
  assigneeIds?: string[];
  teamId?: string | null;
}

export interface CreateTaskInput {
  type?: LeadTaskType;
  title: string;
  dueAt?: string | null;
  assigneeId?: string | null;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  completed?: boolean;
}

/**
 * Where a contact sits on its org's board, for the inbox panel.
 *
 * `stageId` is null when the contact is not on the board — the same absence a
 * contact with no lifecycle has today, not an error. `loss` is what clearing the
 * stage would destroy, carried along so the confirmation needs no second call.
 */
export interface ContactStage {
  pipelineId: string;
  leadId: string | null;
  stageId: string | null;
  loss: { notes: number; tasks: number; activities: number; assignees: number } | null;
}

/**
 * What a bulk assign did. `matched` can be under `requested` when the selection
 * held contacts from outside the org, and `unchanged` counts the ones already
 * sitting on the target column.
 */
export interface BulkStageResult {
  pipelineId: string;
  requested: number;
  matched: number;
  changed: number;
  unchanged: number;
}
