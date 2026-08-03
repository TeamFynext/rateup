import { useEffect } from "react";
import { FormProvider, useForm as useRHForm } from "react-hook-form";
import { toast } from "sonner";
import { useSessionContext } from "supertokens-auth-react/recipe/session";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useBoardsQueries } from "@/backend/tickets/tickets.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button.tsx";

import type { NodeData, NodeTypeMap, TypedNode } from "../types/node-types.ts";
import { firstNodeError, nodeResolver } from "../types/node-validation.ts";
import { ContainedTextField } from "./editor-ui.tsx";
import { FlowPanel } from "./flow-panel.tsx";
import { AssignNodeEditor } from "./node-editors/AssignNodeEditor.tsx";
import { ButtonNodeEditor } from "./node-editors/ButtonNodeEditor.tsx";
import { CatalogNodeEditor } from "./node-editors/CatalogNodeEditor.tsx";
import { ConditionalNodeEditor } from "./node-editors/ConditionalNodeEditor.tsx";
import { ContactsNodeEditor } from "./node-editors/ContactsNodeEditor.tsx";
import { CtaUrlNodeEditor } from "./node-editors/CtaUrlNodeEditor.tsx";
import { FlowNodeEditor } from "./node-editors/FlowNodeEditor.tsx";
import { InputNodeEditor } from "./node-editors/InputNodeEditor.tsx";
import { InstagramGenericTemplateNodeEditor } from "./node-editors/InstagramGenericTemplateNodeEditor.tsx";
import { InstagramIceBreakerNodeEditor } from "./node-editors/InstagramIceBreakerNodeEditor.tsx";
import { InstagramProductTemplateNodeEditor } from "./node-editors/InstagramProductTemplateNodeEditor.tsx";
import { InstagramQuickReplyNodeEditor } from "./node-editors/InstagramQuickReplyNodeEditor.tsx";
import { InstagramStoryReplyNodeEditor } from "./node-editors/InstagramStoryReplyNodeEditor.tsx";
import { LeadgenNodeEditor } from "./node-editors/LeadgenNodeEditor.tsx";
import { ListNodeEditor } from "./node-editors/ListNodeEditor.tsx";
import { LocationNodeEditor } from "./node-editors/LocationNodeEditor.tsx";
import { MediaNodeEditor } from "./node-editors/MediaNodeEditor.tsx";
import { PauseNodeEditor } from "./node-editors/PauseNodeEditor.tsx";
import { styles } from "./node-editors/shared.tsx";
import { StartNodeEditor } from "./node-editors/StartNodeEditor.tsx";
import { TemplateNodeEditor } from "./node-editors/TemplateNodeEditor.tsx";
import { TextNodeEditor } from "./node-editors/TextNodeEditor.tsx";
import { TicketNodeEditor } from "./node-editors/TicketNodeEditor.tsx";
import { getNodeLabel, getNodeVisual } from "./nodes/node-config.tsx";

// Node editor props
interface NodeEditorProps {
  node: TypedNode;
  onChange: (nodeId: string, data: NodeData) => void;
  onClose: () => void;
}

export default function NodeEditor({ node, onChange, onClose }: Readonly<NodeEditorProps>) {
  const { data: templates, isLoading } = useWaTemplates();
  const { data: flows, isPending } = useWaFlowsFromDb();
  // Tickets are a free feature — always available.
  const hasTicketFeature = true;
  const { data: boardData, isLoading: isBoardsPending } = useBoardsQueries(hasTicketFeature);
  const { data: teamMembers, isPending: isLoadingTeamMembers } = useTeamsMembersOfOrg();
  const session = useSessionContext() as {
    userId: string;
  };

  // react-hook-form is the single source of truth for the editor. Values sync
  // back to the flow on every change; the resolver produces per-field errors
  // (shown inline) and drives the node card's invalid border.
  const form = useRHForm<NodeData>({
    defaultValues: node.data,
    resolver: nodeResolver(node.type),
    mode: "onChange",
  });
  const nodeData = form.watch();
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>;
  // Errors are only surfaced after the first Save attempt (then live-updated).

  // Reset whenever a different node is opened — no validation until Save.
  useEffect(() => {
    form.reset(node.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  // Writes any field of the node currently being edited. Each child editor
  // writes its own node type's fields; `NodeData` is the union of all of them,
  // so react-hook-form's per-path value type cannot be satisfied statically —
  // the setter is narrowed to the (key, value) pair the children actually use.
  const setNodeField = form.setValue as (
    key: string,
    value: unknown,
    options?: { shouldDirty?: boolean },
  ) => void;
  const handleInputChange = (key: string, value: unknown) => {
    setNodeField(key, value, {
      shouldDirty: true,
    });
    onChange(node.id, form.getValues());
  };

  // Handle done button with validation
  const handleDone = async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast.error(firstNodeError({ ...node, data: form.getValues() }));
      return;
    }
    onClose();
  };

  // Render different editor based on node type with proper type casting
  const renderEditor = () => {
    const nodeType = node.type;
    if (isPending || isLoading || isBoardsPending || isLoadingTeamMembers) return <RateupLoader />;

    switch (nodeType) {
      case "textNode":
        return (
          <TextNodeEditor
            nodeData={nodeData as NodeTypeMap["textNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "conditionalNode":
        return (
          <ConditionalNodeEditor
            nodeData={nodeData as NodeTypeMap["conditionalNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "textInputNode":
      case "numberInputNode":
      case "emailInputNode":
      case "phoneInputNode":
      case "dateInputNode":
        return (
          <InputNodeEditor
            nodeData={nodeData as NodeTypeMap[typeof nodeType]}
            handleInputChange={handleInputChange}
          />
        );

      case "pauseNode":
        return (
          <PauseNodeEditor
            nodeData={nodeData as NodeTypeMap["pauseNode"]}
            handleInputChange={handleInputChange}
          />
        );

      case "documentNode":
      case "imageNode":
      case "videoNode":
      case "audioNode":
        return (
          <MediaNodeEditor
            nodeData={nodeData as NodeTypeMap[typeof nodeType]}
            handleInputChange={handleInputChange}
            nodeType={nodeType}
          />
        );
      case "startNode":
        return (
          <StartNodeEditor
            nodeData={nodeData as NodeTypeMap["startNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "buttonNode":
        return (
          <ButtonNodeEditor
            nodeData={nodeData as NodeTypeMap["buttonNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "listNode":
        return (
          <ListNodeEditor
            nodeData={nodeData as NodeTypeMap["listNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "ctaUrlNode":
        return (
          <CtaUrlNodeEditor
            nodeData={nodeData as NodeTypeMap["ctaUrlNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "templateNode":
        return (
          <TemplateNodeEditor
            nodeData={nodeData as NodeTypeMap["templateNode"]}
            handleInputChange={handleInputChange}
            templates={templates}
          />
        );
      case "locationNode":
        return (
          <LocationNodeEditor
            nodeData={nodeData as NodeTypeMap["locationNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "contactsNode":
        return (
          <ContactsNodeEditor
            nodeData={nodeData as NodeTypeMap["contactsNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "ticketNode":
        return (
          <TicketNodeEditor
            nodeData={nodeData as NodeTypeMap["ticketNode"]}
            handleInputChange={handleInputChange}
            options={boardData}
          />
        );
      case "assignNode":
        return (
          <AssignNodeEditor
            nodeData={nodeData as NodeTypeMap["assignNode"]}
            handleInputChange={handleInputChange}
            options={{ ...teamMembers, currentUserId: session?.userId }}
          />
        );
      case "flowNode":
        return (
          <FlowNodeEditor
            nodeData={nodeData as NodeTypeMap["flowNode"]}
            handleInputChange={handleInputChange}
            flows={flows}
          />
        );
      case "leadgenNode":
        return (
          <LeadgenNodeEditor
            nodeData={nodeData as NodeTypeMap["leadgenNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "catalogNode":
        return (
          <CatalogNodeEditor
            nodeData={nodeData as NodeTypeMap["catalogNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramGenericTemplateNode":
        return (
          <InstagramGenericTemplateNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramGenericTemplateNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramQuickReplyNode":
        return (
          <InstagramQuickReplyNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramQuickReplyNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramStoryReplyNode":
        return (
          <InstagramStoryReplyNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramStoryReplyNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramProductTemplateNode":
        return (
          <InstagramProductTemplateNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramProductTemplateNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramIceBreakerNode":
        return (
          <InstagramIceBreakerNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramIceBreakerNode"]}
            handleInputChange={handleInputChange}
          />
        );

      default:
        return (
          <div className={styles.editorSection}>
            <p>No editor available for this node type: {node.type}</p>
          </div>
        );
    }
  };

  return (
    <FlowPanel
      side="right"
      title={nodeData.label || getNodeLabel(node.type)}
      icon={
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: getNodeVisual(node.type).color }}
        />
      }
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={handleDone}>
          Save
        </Button>
      }
    >
      <FormProvider {...form}>
        <div className={styles.editorSection}>
          <ContainedTextField
            type="text"
            label="Node Label"
            value={nodeData.label || ""}
            onChange={(e) => handleInputChange("label", e.target.value)}
            placeholder="Enter node label..."
            error={errors.label?.message}
          />
        </div>

        {renderEditor()}
      </FormProvider>
    </FlowPanel>
  );
}
