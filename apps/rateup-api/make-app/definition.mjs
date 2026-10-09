/**
 * The RateUp app on Make, as data. `deploy.mjs` pushes it to Make's SDK Apps API;
 * nothing here runs inside RateUp. The API it calls is
 * `src/modules/integrations/external/make/` — change the two together.
 *
 * `api` is the RateUp API's public address (a dev tunnel locally), baked into
 * the base URL and the webhook attach/detach calls.
 */

/** The 11 triggers: RateUp's trigger keys (`ZapierTriggers`) and the fields each payload carries. */
const CONTACT_FIELDS = [
  { name: "id", type: "text", label: "Contact ID" },
  { name: "name", type: "text", label: "Name" },
  { name: "phone", type: "text", label: "Phone" },
  { name: "email", type: "text", label: "Email" },
  { name: "source", type: "text", label: "Source" },
  { name: "igsId", type: "text", label: "Instagram ID" },
];

const CONTACT_SAMPLE = {
  id: "0b7c6a52-1f5e-4c6e-9d6a-2f4b8e1c9a10",
  name: "Ann Mathew",
  phone: "919876543210",
  email: "ann@example.com",
  source: "INDIVIDUAL",
  igsId: null,
};

export const TRIGGERS = [
  {
    event: "new_contact_create",
    name: "watchNewContacts",
    label: "Watch New Contacts",
    description: "Triggers when a contact is created in RateUp.",
    interface: CONTACT_FIELDS,
    sample: CONTACT_SAMPLE,
  },
  {
    event: "contact_updated",
    name: "watchUpdatedContacts",
    label: "Watch Updated Contacts",
    description: "Triggers when a contact's details or conversation status change.",
    interface: CONTACT_FIELDS,
    sample: CONTACT_SAMPLE,
  },
  {
    event: "contact_deleted",
    name: "watchDeletedContacts",
    label: "Watch Deleted Contacts",
    description: "Triggers when a contact is deleted.",
    interface: CONTACT_FIELDS,
    sample: CONTACT_SAMPLE,
  },
  {
    event: "conversation_closed",
    name: "watchClosedConversations",
    label: "Watch Closed Conversations",
    description: "Triggers when a conversation is closed in the inbox.",
    interface: CONTACT_FIELDS,
    sample: CONTACT_SAMPLE,
  },
  {
    event: "new_contact_assignee",
    name: "watchContactAssignments",
    label: "Watch Contact Assignments",
    description: "Triggers when a contact is assigned to team members.",
    interface: [
      { name: "contactId", type: "text", label: "Contact ID" },
      { name: "name", type: "text", label: "Name" },
      { name: "phone", type: "text", label: "Phone" },
      { name: "email", type: "text", label: "Email" },
      { name: "igsId", type: "text", label: "Instagram ID" },
      {
        name: "assignees",
        type: "array",
        label: "Assignees",
        spec: [
          { name: "name", type: "text", label: "Name" },
          { name: "email", type: "text", label: "Email" },
          { name: "teamName", type: "text", label: "Team" },
          { name: "teamCode", type: "text", label: "Team code" },
        ],
      },
    ],
    sample: {
      contactId: CONTACT_SAMPLE.id,
      name: "Ann Mathew",
      phone: "919876543210",
      email: "ann@example.com",
      igsId: null,
      assignees: [{ name: "Ravi", email: "ravi@example.com", teamName: "Sales", teamCode: "SAL" }],
    },
  },
  {
    event: "new_message_received",
    name: "watchMessages",
    label: "Watch Messages",
    description: "Triggers when a customer sends a message.",
    interface: [
      { name: "from", type: "text", label: "From" },
      { name: "messageBody", type: "any", label: "Message" },
      { name: "platform", type: "text", label: "Platform" },
      { name: "source", type: "text", label: "Source" },
      { name: "messageId", type: "text", label: "Message ID" },
    ],
    sample: {
      from: "919876543210",
      messageBody: { text: { body: "Hi, is my order ready?" } },
      platform: "WHATSAPP",
      source: "919800000000",
      messageId: "wamid.HBgLOTE5ODc2NTQzMjEw",
    },
  },
  {
    event: "contact_lifecycle_updated",
    name: "watchLifecycleChanges",
    label: "Watch Lifecycle Changes",
    description: "Triggers when a contact moves to another lifecycle.",
    interface: [
      { name: "contactId", type: "text", label: "Contact ID" },
      { name: "lifecycleId", type: "text", label: "Lifecycle ID" },
      { name: "lifecycleName", type: "text", label: "Lifecycle" },
    ],
    sample: { contactId: CONTACT_SAMPLE.id, lifecycleId: "lc-1", lifecycleName: "Customer" },
  },
  {
    event: "contact_stage_updated",
    name: "watchLeadStageChanges",
    label: "Watch Lead Stage Changes",
    description: "Triggers when a contact's lead is created or moved to another stage.",
    interface: [
      { name: "contactId", type: "text", label: "Contact ID" },
      { name: "leadId", type: "text", label: "Lead ID" },
      { name: "pipelineId", type: "text", label: "Pipeline ID" },
      { name: "pipelineName", type: "text", label: "Pipeline" },
      { name: "stageId", type: "text", label: "Stage ID" },
      { name: "stageName", type: "text", label: "Stage" },
      { name: "stageStatus", type: "text", label: "Stage status" },
    ],
    sample: {
      contactId: CONTACT_SAMPLE.id,
      leadId: "lead-1",
      pipelineId: "pl-1",
      pipelineName: "Leads",
      stageId: "st-2",
      stageName: "Qualified",
      stageStatus: "OPEN",
    },
  },
  {
    event: "contact_added_to_group",
    name: "watchGroupMembers",
    label: "Watch Contacts Added to a Group",
    description: "Triggers once for each contact added to a contact group.",
    interface: [
      { name: "contactId", type: "text", label: "Contact ID" },
      { name: "contactGroupId", type: "text", label: "Group ID" },
    ],
    sample: { contactId: CONTACT_SAMPLE.id, contactGroupId: "grp-1" },
  },
  {
    event: "response_submitted",
    name: "watchSurveyResponses",
    label: "Watch Survey Responses",
    description: "Triggers when a survey response is submitted.",
    interface: [
      { name: "survey", type: "text", label: "Survey" },
      { name: "team", type: "text", label: "Team" },
      { name: "contactId", type: "text", label: "Contact ID" },
      { name: "responses", type: "any", label: "Responses" },
      { name: "createdAt", type: "date", label: "Submitted at" },
      { name: "language", type: "text", label: "Language" },
      { name: "platform", type: "text", label: "Platform" },
      { name: "tag", type: "text", label: "Tag" },
      { name: "location", type: "any", label: "Location" },
      { name: "deviceData", type: "any", label: "Device" },
    ],
    sample: {
      survey: "Store visit feedback",
      team: "Kochi store",
      contactId: CONTACT_SAMPLE.id,
      responses: [{ question: "How was your visit?", answer: "5" }],
      createdAt: "2026-10-07T09:30:00.000Z",
      language: "en",
      platform: "WHATSAPP",
      tag: null,
      location: null,
      deviceData: null,
    },
  },
  {
    event: "new_staff_joined_to_team",
    name: "watchTeamMembers",
    label: "Watch New Team Members",
    description: "Triggers when someone joins a team in RateUp.",
    interface: [
      { name: "name", type: "text", label: "Name" },
      { name: "email", type: "text", label: "Email" },
      { name: "teamName", type: "text", label: "Team" },
      { name: "teamCode", type: "text", label: "Team code" },
      { name: "isExistingUser", type: "boolean", label: "Already had a RateUp account" },
    ],
    sample: {
      name: "Ravi",
      email: "ravi@example.com",
      teamName: "Sales",
      teamCode: "SAL",
      isExistingUser: false,
    },
  },
];

const PHONE_HELP = "With the country code, e.g. +91 98765 43210.";

/** The contact a contact action returns. */
const CONTACT_OUTPUT = [
  ...CONTACT_FIELDS,
  { name: "waMessageAssignStatus", type: "text", label: "Conversation status" },
  { name: "createdAt", type: "date", label: "Created at" },
];

export function buildApp(api) {
  const base = `${api.replace(/\/+$/, "")}/api/integration/external/make`;
  const auth = { authorization: "Bearer {{connection.apiKey}}" };
  const sanitize = { sanitize: ["request.headers.authorization"] };

  return {
    app: {
      label: "RateUp",
      description:
        "WhatsApp contacts, conversations, leads and surveys from RateUp: start scenarios on RateUp events and send WhatsApp messages and templates.",
      theme: "#1E3A8A",
      language: "en",
    },

    base: {
      baseUrl: base,
      headers: auth,
      response: {
        error: {
          message: "[{{statusCode}}] {{ifempty(body.error, body.message)}}",
        },
      },
      log: sanitize,
    },

    connection: {
      label: "RateUp",
      type: "basic",
      parameters: [
        {
          name: "apiKey",
          type: "password",
          label: "API key",
          help: "In RateUp: Settings → Integrations → Make → Create API key.",
          required: true,
          editable: true,
        },
      ],
      api: {
        url: `${base}/me`,
        method: "GET",
        headers: { authorization: "Bearer {{parameters.apiKey}}" },
        response: {
          metadata: { type: "text", value: "{{body.orgName}}" },
          error: { message: "[{{statusCode}}] {{ifempty(body.error, body.message)}}" },
        },
        log: sanitize,
      },
    },

    // One dedicated webhook per trigger: turning a scenario on attaches it (RateUp
    // stores the hook and returns its id), turning it off detaches it by that id.
    webhooks: TRIGGERS.map((trigger) => ({
      label: `RateUp: ${trigger.label.replace(/^Watch /, "")}`,
      event: trigger.event,
      type: "web",
      api: {
        respond: { status: 200, type: "json", body: { received: true } },
        output: "{{body}}",
      },
      parameters: [],
      attach: {
        url: `${base}/hooks`,
        method: "POST",
        headers: auth,
        body: { url: "{{webhook.url}}", event: trigger.event },
        response: { data: { externalHookId: "{{body.id}}" } },
        log: sanitize,
      },
      detach: {
        url: `${base}/hooks/{{webhook.externalHookId}}`,
        method: "DELETE",
        headers: auth,
        log: sanitize,
      },
    })),

    rpcs: [
      {
        name: "listTeams",
        label: "List teams",
        api: {
          url: "/teams",
          method: "GET",
          response: {
            iterate: "{{body}}",
            output: { label: "{{item.name}}", value: "{{item.id}}" },
          },
        },
      },
      {
        name: "listGroups",
        label: "List contact groups",
        api: {
          url: "/groups",
          method: "GET",
          response: {
            iterate: "{{body}}",
            output: { label: "{{item.name}}", value: "{{item.id}}" },
          },
        },
      },
      {
        name: "listLifecycles",
        label: "List lifecycles",
        api: {
          url: "/lifecycles",
          method: "GET",
          response: {
            iterate: "{{body}}",
            output: { label: "{{item.name}}", value: "{{item.id}}" },
          },
        },
      },
      {
        name: "listTemplates",
        label: "List approved WhatsApp templates",
        api: {
          url: "/templates",
          method: "GET",
          response: {
            iterate: "{{body}}",
            output: {
              label: "{{item.name}} ({{item.language}}, {{item.variableCount}} variables)",
              value: "{{item.id}}",
            },
          },
        },
      },
    ],

    modules: [
      // Instant triggers, one per webhook.
      ...TRIGGERS.map((trigger) => ({
        name: trigger.name,
        typeId: 10,
        label: trigger.label,
        description: trigger.description,
        webhookEvent: trigger.event,
        api: {},
        parameters: [],
        expect: [],
        interface: trigger.interface,
        samples: trigger.sample,
      })),

      {
        name: "createContact",
        typeId: 4,
        label: "Create a Contact",
        description: "Creates a contact in RateUp.",
        api: {
          url: "/contacts",
          method: "POST",
          body: {
            name: "{{parameters.name}}",
            phone: "{{parameters.phone}}",
            email: "{{ifempty(parameters.email, undefined)}}",
            source: "{{ifempty(parameters.source, 'INDIVIDUAL')}}",
          },
          response: { output: "{{body}}" },
        },
        parameters: [],
        expect: [
          { name: "name", type: "text", label: "Name", required: true },
          { name: "phone", type: "text", label: "Phone", help: PHONE_HELP, required: true },
          { name: "email", type: "email", label: "Email" },
          {
            name: "source",
            type: "select",
            label: "Add as",
            options: [
              { label: "A regular contact", value: "INDIVIDUAL" },
              { label: "A loyalty member (sends the registration message)", value: "LOYALTY" },
            ],
            default: "INDIVIDUAL",
          },
        ],
        interface: CONTACT_OUTPUT,
        samples: CONTACT_SAMPLE,
      },
      {
        name: "updateContact",
        typeId: 4,
        label: "Update a Contact",
        description: "Changes a contact's name or email, or closes or reopens their conversation.",
        api: {
          url: "/contacts/{{parameters.contactId}}",
          method: "PATCH",
          body: "{{omit(parameters, 'contactId')}}",
          response: { output: "{{body}}" },
        },
        parameters: [],
        expect: [
          { name: "contactId", type: "text", label: "Contact ID", required: true },
          { name: "name", type: "text", label: "Name" },
          { name: "email", type: "email", label: "Email" },
          {
            name: "waMessageAssignStatus",
            type: "select",
            label: "Conversation",
            options: [
              { label: "Close it", value: "CLOSED" },
              { label: "Reopen it, unassigned", value: "UNASSIGNED" },
            ],
          },
        ],
        interface: CONTACT_OUTPUT,
        samples: CONTACT_SAMPLE,
      },
      {
        name: "deleteContact",
        typeId: 4,
        label: "Delete a Contact",
        description: "Deletes a contact from RateUp.",
        api: {
          url: "/contacts/{{parameters.contactId}}",
          method: "DELETE",
          response: { output: "{{body}}" },
        },
        parameters: [],
        expect: [{ name: "contactId", type: "text", label: "Contact ID", required: true }],
        interface: [
          { name: "id", type: "text", label: "Contact ID" },
          { name: "deleted", type: "boolean", label: "Deleted" },
        ],
        samples: { id: CONTACT_SAMPLE.id, deleted: true },
      },
      {
        name: "setContactLifecycle",
        typeId: 4,
        label: "Set a Contact's Lifecycle",
        description: "Moves a contact to a lifecycle.",
        api: {
          url: "/contacts/{{parameters.contactId}}/lifecycle",
          method: "PUT",
          body: { lifecycleId: "{{parameters.lifecycleId}}" },
          response: { output: "{{body}}" },
        },
        parameters: [],
        expect: [
          { name: "contactId", type: "text", label: "Contact ID", required: true },
          {
            name: "lifecycleId",
            type: "select",
            label: "Lifecycle",
            options: "rpc://listLifecycles",
            required: true,
          },
        ],
        interface: [
          { name: "contactId", type: "text", label: "Contact ID" },
          { name: "lifecycleId", type: "text", label: "Lifecycle ID" },
          { name: "lifecycleName", type: "text", label: "Lifecycle" },
        ],
        samples: { contactId: CONTACT_SAMPLE.id, lifecycleId: "lc-1", lifecycleName: "Customer" },
      },
      {
        name: "addContactToGroup",
        typeId: 4,
        label: "Add a Contact to a Group",
        description: "Adds a contact to a contact group, creating the contact if it is new.",
        api: {
          url: "/groups/{{parameters.groupId}}/members",
          method: "POST",
          body: {
            contacts: [
              {
                name: "{{parameters.name}}",
                phone: "{{parameters.phone}}",
                email: "{{ifempty(parameters.email, undefined)}}",
                source: "INDIVIDUAL",
              },
            ],
          },
          response: { output: "{{body}}" },
        },
        parameters: [],
        expect: [
          {
            name: "groupId",
            type: "select",
            label: "Group",
            options: "rpc://listGroups",
            required: true,
          },
          { name: "name", type: "text", label: "Name", required: true },
          { name: "phone", type: "text", label: "Phone", help: PHONE_HELP, required: true },
          { name: "email", type: "email", label: "Email" },
        ],
        interface: [{ name: "success", type: "boolean", label: "Added" }],
        samples: { success: true },
      },
      {
        name: "sendTemplate",
        typeId: 4,
        label: "Send a WhatsApp Template",
        description:
          "Sends an approved WhatsApp template. Works any time, even when the customer has not messaged in the last 24 hours.",
        api: {
          url: "/messages/template",
          method: "POST",
          body: {
            phone: "{{parameters.phone}}",
            templateId: "{{parameters.templateId}}",
            variables: "{{ifempty(parameters.variables, emptyarray)}}",
            teamId: "{{ifempty(parameters.teamId, undefined)}}",
          },
          response: { output: "{{body}}" },
        },
        parameters: [],
        expect: [
          { name: "phone", type: "text", label: "Phone", help: PHONE_HELP, required: true },
          {
            name: "templateId",
            type: "select",
            label: "Template",
            options: "rpc://listTemplates",
            required: true,
          },
          {
            name: "variables",
            type: "array",
            label: "Template variables",
            help: "The values for the template body's numbered placeholders (1, 2, …), in order.",
            spec: { type: "text", label: "Value" },
          },
          {
            name: "teamId",
            type: "select",
            label: "Team",
            help: "Only needed when the template's button opens a survey.",
            options: "rpc://listTeams",
          },
        ],
        interface: [
          { name: "success", type: "boolean", label: "Sent" },
          { name: "messageId", type: "text", label: "Message ID" },
        ],
        samples: { success: true, messageId: "wamid.HBgLOTE5ODc2NTQzMjEw" },
      },
      {
        name: "sendText",
        typeId: 4,
        label: "Send a WhatsApp Text Message",
        description:
          "Sends a plain text message. WhatsApp only delivers it within 24 hours of the customer's last message; use a template otherwise.",
        api: {
          url: "/messages/text",
          method: "POST",
          body: { phone: "{{parameters.phone}}", message: "{{parameters.message}}" },
          response: { output: "{{body}}" },
        },
        parameters: [],
        expect: [
          { name: "phone", type: "text", label: "Phone", help: PHONE_HELP, required: true },
          { name: "message", type: "text", label: "Message", multiline: true, required: true },
        ],
        interface: [{ name: "success", type: "boolean", label: "Sent" }],
        samples: { success: true },
      },
      {
        name: "searchContacts",
        typeId: 9,
        label: "Search Contacts",
        description: "Finds contacts by exact phone number or email.",
        api: {
          url: "/contacts",
          method: "GET",
          qs: {
            phone: "{{ifempty(parameters.phone, undefined)}}",
            email: "{{ifempty(parameters.email, undefined)}}",
          },
          response: { iterate: "{{body}}", output: "{{item}}" },
        },
        parameters: [],
        expect: [
          { name: "phone", type: "text", label: "Phone", help: PHONE_HELP },
          { name: "email", type: "email", label: "Email" },
        ],
        interface: CONTACT_OUTPUT,
        samples: CONTACT_SAMPLE,
      },
    ],

    groups: [
      { label: "Triggers", modules: TRIGGERS.map((t) => t.name) },
      {
        label: "Contacts",
        modules: [
          "createContact",
          "updateContact",
          "deleteContact",
          "setContactLifecycle",
          "addContactToGroup",
          "searchContacts",
        ],
      },
      { label: "WhatsApp", modules: ["sendTemplate", "sendText"] },
    ],
  };
}
