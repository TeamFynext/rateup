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

/** What a board is for; fixed at creation. Mirrors `PipelineType` in rateup-api. */
export type PipelineType = "LEADS" | "SUPPORT" | "PROJECTS" | "CUSTOM";

/** The pipeline switcher's row — name plus a live open-lead count. */
export interface PipelineSummary {
  id: string;
  name: string;
  description: string | null;
  order: number;
  type: PipelineType;
  rottingEnabled: boolean;
  autoAssignEnabled: boolean;
  nudgeEnabled: boolean;
  teamIds: string[];
  openLeadCount: number;
}

/** Org-wide, unlike the pipeline list, which holds only boards on the viewer's teams. */
export interface PipelineCreateLimits {
  hasLeadsPipeline: boolean;
  otherCount: number;
  otherLimit: number;
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
  updatedAt: string;
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
  /** The card's share link id: `/pl/<shortUrlId>`. */
  shortUrlId: string | null;
  name: string;
  description: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  status: LeadStatus;
  source: LeadSource;
  channel: LeadChannel;
  pipelineId: string;
  stageId: string;
  stage: LeadStageRef;
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
  /** Every open activity, soonest first; `nextTask` is the first of them. */
  openTasks: LeadTask[];
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

// ------------------------------------------------------- reads & aggregates

/** The saved views in the sidebar, as the API names them. */
export type LeadFilter = "open" | "mine" | "rotting" | "noactivity" | "won" | "lost";

/**
 * Everything that narrows a lead read, sent to the server rather than applied
 * here. A board column asks with its own `stageId`; the list view's ungrouped
 * mode leaves it out and reads the whole board.
 *
 * Optional keys are absent rather than undefined — `normaliseLeadParams` builds
 * these so two equal filters produce one cache key.
 */
export interface LeadListParams {
  filter: LeadFilter;
  search?: string;
  stageId?: string;
  source?: LeadSource;
  assigneeId?: string;
}

/** One keyset page. `nextCursor` is null on the last one. */
export interface LeadPage {
  items: Lead[];
  nextCursor: string | null;
}

/**
 * Every count the board shows, over the whole pipeline.
 *
 * Unfiltered on purpose: the columns are paginated and filtered, so these cannot
 * come from what is loaded. A column header reading 412 above fifty cards is the
 * point — the number describes the pipeline, the cards describe the page.
 */
export interface PipelineStats {
  totals: {
    /** Every lead on the board, closed ones included. */
    leads: number;
    open: number;
    won: number;
    lost: number;
    /** Open leads assigned to the signed-in user. */
    mine: number;
    rotting: number;
    /** Open leads with no incomplete task. */
    noactivity: number;
    avgDaysInStage: number;
    avgAgeDays: number;
    /** Creation to close over won leads; null when nothing has been won. */
    avgCycleDays: number | null;
  };
  stages: Array<{
    stageId: string;
    total: number;
    open: number;
    avgDaysInStage: number;
    rotting: number;
  }>;
  sources: Array<{ source: LeadSource; open: number; total: number }>;
  assignees: Array<{
    /** Null on the unassigned bucket. */
    assigneeId: string | null;
    name: string | null;
    profilePhoto: string | null;
    open: number;
    won: number;
    /** Won plus lost — what `won` is a share of. */
    closed: number;
    stalled: number;
  }>;
}

/** One month of the forecast: the whole count, plus a sample to show. */
export interface ForecastBucket {
  /** "YYYY-MM", or "unscheduled" for leads with no expected close date. */
  key: string;
  unscheduled: boolean;
  count: number;
  /** Leads weighted by their stage probability — the expected conversions. */
  expected: number;
  /** At most 20; `count` says how many the bucket really holds. */
  leads: Lead[];
}

// ------------------------------------------------------------------- payloads

export interface CreatePipelineInput {
  name: string;
  type: PipelineType;
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
  description?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: LeadSource;
  channel?: LeadChannel;
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
