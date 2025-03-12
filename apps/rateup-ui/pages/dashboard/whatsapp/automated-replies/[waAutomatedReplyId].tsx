import React, { useEffect } from "react";

import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  ScrollAreaAutosize,
  Stack,
  Tabs,
  TextInput,
  Title,
  Tooltip,
  Transition,
} from "@mantine/core";
import {
  IconBrowserPlus,
  IconDatabase,
  IconSettings,
  IconShare,
  IconSitemap,
  IconX,
} from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useImmer } from "use-immer";

import {
  useUpdateWaAutomatedReplyMutation,
  useWaAutomatedRepliesMessageById,
  useWaAutomatedReplyById,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { useWaTemplateById } from "@/backend/whatsapp/whatsapp.query";
import LinkWithCopyBtn from "@/components/adminPanel/ShareQRPage/LinkWithCopyBtn";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import RateupLoader from "@/components/Loaders/RateupLoader";
import WaTextEditor from "@/components/RichTextEditor/waTextEditor";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import StyledTabs from "@/components/styled/StyledTabs/StyledTabs";
import ShareQR from "@/components/Survey/ShareSurvey/ShareQR";
import TanstackTable from "@/components/Table/TanstackTable";
import WaTemplateFormElements, {
  NoParams,
} from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/templateDisplayModal/templatePreview/formElements";
import CustomEdge from "@/components/whatsapp/xyflow/CustomEdge";
import ScreenNode from "@/components/whatsapp/xyflow/ScreenNode";
import { useRouteParams } from "@/context/RouteParamsContext";

import { AutomatedReplyForm } from "./create";
import useReplyStore, { ReplyType } from "./store";

const column: ColumnDef<any>[] = [
  {
    header: () => "Created At",
    accessorKey: "createdAt",
    id: "createdAt",
    cell: (info) =>
      dayjs(info.getValue() as string).format("DD/MM/YYYY hh:mm A"),
  },
  {
    header: () => "Message",
    accessorKey: "message",
    id: "message",
    cell: (info) => info.getValue(),
  },
  {
    header: () => "Current Screen",
    accessorKey: "currentScreen",
    id: "currentScreen",
    cell: (info) => info.getValue(),
  },
  {
    header: () => "Phone",
    accessorKey: "phone",
    id: "phone",
    cell: (info) => info.getValue(),
  },
];

const App = () => {
  const router = useRouter();
  let automatedId = router.query.waAutomatedReplyId as string;
  const { data, isPending } = useWaAutomatedReplyById(automatedId);
  const { data: waAutomtedReplyMessage, isLoading } =
    useWaAutomatedRepliesMessageById(automatedId);
  const { data: waSettings, isPending: waPending } = useWaSettings();
  const { close } = useReplyStore();
  const { update } = useRouteParams();

  const updateWaReplyMutation = useUpdateWaAutomatedReplyMutation(
    router.query.waAutomatedReplyId,
  );
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: `screen-1`,
      data: {
        label: `screen-1`,
        components: [],
      },
      position: { x: 100, y: 100 },
      type: "screenNode",
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const addScreenNode = () => {
    const lastNode = nodes.findLast((node) => node.id);
    let id = `screen-${nodes.length + 1}`;
    const newNode = {
      id: id,
      data: {
        label: id,
        components: [],
      },
      position: {
        x: (lastNode?.position?.x ?? -250) + 350,
        y: lastNode?.position?.y ?? 100,
      },
      type: "screenNode",
    };
    setNodes((nds) => nds.concat(newNode));
  };

  // const onConnect = (params) => setEdges((eds) => addEdge(params, eds));
  const onConnect = (params) =>
    setEdges((eds) => addEdge({ ...params, type: "custom" }, eds));

  const saveFlow = () => {
    updateWaReplyMutation.mutate({
      id: router.query.waAutomatedReplyId as string,
      ...data,
      matchData: {
        ...data.matchData,
        json: { nodes, edges },
      },
    });
  };
  const nodeTypes = React.useMemo(
    () => ({
      screenNode: (props) => <ScreenNode {...props} setNodes={setNodes} />,
      type1: Type1Node,
      type2: Type2Node,
      type3: Type3Node,
    }),
    [setNodes],
  );
  useEffect(() => {
    if (!isPending) {
      const { nodes = [], edges = [] } = data?.matchData?.json || {};
      setNodes(nodes);
      setEdges(edges);
      update({ waAutomatedReplyId: data?.name });
    }
  }, [data]);

  useEffect(() => {
    setEdges((edges) =>
      edges.filter((edge) => nodes.some((node) => node.id === edge.target)),
    );
  }, [nodes]);

  if (isPending || isLoading || waPending) return <RateupLoader />;
  let link = `https://api.whatsapp.com/send/?phone=${encodeURIComponent(waSettings?.phone?.replace("+", ""))}&text=${encodeURIComponent(data?.commands?.[0] ?? "")}`;
  return (
    <StyledTabs
      keepMounted={false}
      defaultValue="flow"
      h={"100%"}
      onChange={close}
    >
      <Group justify="space-between">
        <>
          <Tooltip label={"click to create new screen"}>
            <ActionIcon radius={"xl"} size={"lg"} onClick={addScreenNode}>
              <IconBrowserPlus />
            </ActionIcon>
          </Tooltip>
        </>
        <Tabs.List>
          <Tabs.Tab value="flow" leftSection={<IconSitemap size={18} />}>
            Flow
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={18} />}>
            settings
          </Tabs.Tab>
          <Tabs.Tab value="share" leftSection={<IconShare size={18} />}>
            share
          </Tabs.Tab>
          <Tabs.Tab value="result" leftSection={<IconDatabase size={18} />}>
            Result
          </Tabs.Tab>
        </Tabs.List>
        <Button
          onClick={saveFlow}
          variant="light"
          loading={updateWaReplyMutation.isPending}
        >
          Save
        </Button>
      </Group>

      <Tabs.Panel value="flow">
        <Stack style={{ width: "100%", height: "100%" }}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              defaultEdgeOptions={{
                animated: true,
                type: "smoothstep",
              }}
              snapToGrid
              // fitView
              nodeTypes={nodeTypes}
              proOptions={{
                hideAttribution: true,
              }}
              edgeTypes={{ custom: CustomEdge }}
            >
              <Background
                gap={12}
                size={1}
                bgColor="light-dark(#D3D3D3, var(--mantine-color-body))"
              />
              <Controls />

              <RightSection setNodes={setNodes} nodes={nodes} />
            </ReactFlow>
          </ReactFlowProvider>
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="settings">
        <Stack align="center">
          <div>
            <Title>{data?.name}</Title>
            <AutomatedReplyForm initialValues={data} editMode />
          </div>
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="share">
        <Stack p={"xs"} flex={1} align="center">
          <LinkWithCopyBtn link={link} />
          <ShareQR url={link} title={`New`} isPublished={true} />
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="result">
        <PaperLayout p={0} h={"96%"} w={"98%"} mah={"800px"} m={"xs"}>
          <TanstackTable data={waAutomtedReplyMessage} columns={column} />
        </PaperLayout>
      </Tabs.Panel>
    </StyledTabs>
  );
};

const Type1Node = ({ data }) => (
  <div>
    <strong>{data.label}</strong>
    <p>{data.description}</p>
  </div>
);

const Type2Node = ({ data }) => (
  <div>
    <strong>{data.label}</strong>
    <p>{data.description}</p>
  </div>
);

const Type3Node = ({ data }) => (
  <div>
    <strong>{data.label}</strong>
    <p>{data.description}</p>
  </div>
);

export default App;

export const RightSection = ({ setNodes, nodes }) => {
  const { id, type, opened, close } = useReplyStore();
  return (
    <Transition
      mounted={opened}
      transition="slide-left"
      duration={400}
      timingFunction="ease"
    >
      {(styles) => (
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          pos={"fixed"}
          right={0}
          h={"100%"}
          style={{
            ...styles,
            zIndex: 4,
          }}
          w={type === ReplyType.Editor ? 450 : 350}
        >
          <Group gap="xs" justify="space-between">
            <Title order={2}>
              {type === ReplyType.Editor ? "Editor" : "Template Parameters"}
            </Title>
            <ActionIcon onClick={close} variant="light">
              <IconX />
            </ActionIcon>
          </Group>
          {type === ReplyType.Template ? (
            <TemplateEditor id={id} setNodes={setNodes} nodes={nodes} />
          ) : (
            <RichTextEditor id={id} setNodes={setNodes} nodes={nodes} />
          )}
        </Card>
      )}
    </Transition>
  );
};

const TemplateEditor = ({ id, setNodes, nodes }) => {
  const { data, isPending } = useWaTemplateById(id);
  const [parameterData, setParameterData] = useImmer<any>([]);

  useEffect(() => {
    if (id) {
      const parameters = nodes.map(
        (node) =>
          node.data.components?.find((comp) => comp.name === id)?.parameter,
      );
      let d = parameters?.length > 0 ? (parameters?.[0] ?? []) : [];
      setParameterData(d);
    }
  }, [id]);

  if (!id) return null;
  if (isPending) return <RateupLoader />;

  const saveParameter = () => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.data.components.some((comp) => comp.name === id)) {
          return {
            ...node,
            data: {
              ...node.data,
              components: node.data.components.map((comp) =>
                comp.name === id ? { ...comp, parameter: parameterData } : comp,
              ),
            },
          };
        }
        return node;
      }),
    );
  };

  return (
    <>
      <Box my={"xs"}>
        <RateupButtonPrimary title="Save" onClick={saveParameter} />
      </Box>
      <ScrollAreaAutosize mah={"60dvh"}>
        <Box pr={"sm"}>
          {data?.data?.components?.length <= 1 &&
          data?.data?.components?.[0]?.example === undefined ? (
            <Stack justify="center" align="center" h={"60dvh"}>
              <NoParams type={"Body"} />
            </Stack>
          ) : (
            <WaTemplateFormElements
              setParameterData={setParameterData}
              template={data?.data}
              parameters={parameterData}
            />
          )}
        </Box>
      </ScrollAreaAutosize>
    </>
  );
};

const RichTextEditor = ({ setNodes, nodes, id }) => {
  // Find content using useMemo to cache the result
  const content = useMemo(() => {
    return nodes?.reduce((found, node) => {
      if (found) return found; // Early return if already found

      return node?.data?.components?.reduce((fieldFound, comp) => {
        if (fieldFound) return fieldFound;
        return Array.isArray(comp?.name)
          ? comp?.name?.find((name) => name?.id === id)
          : null;
      }, null);
    }, null);
  }, [nodes, id]);

  // Memoize the change handler
  const handleInputChange = useCallback(
    (value) => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          // Skip nodes that don't have matching components
          const hasMatchingComponent = node.data.components?.some(
            (comp) =>
              Array.isArray(comp?.name) &&
              comp.name?.some((field) => field.id === id),
          );

          if (!hasMatchingComponent) return node;

          // Update matching node
          return {
            ...node,
            data: {
              ...node.data,
              components: node.data.components.map((comp) => {
                const hasMatchingField =
                  Array.isArray(comp?.name) &&
                  comp.name?.some((field) => field.id === id);

                if (!hasMatchingField) return comp;

                return {
                  ...comp,
                  name: comp.name.map((field) =>
                    field.id === id ? { ...field, value } : field,
                  ),
                };
              }),
            },
          };
        }),
      );
    },
    [id, setNodes],
  );

  // Don't render if no content found
  if (!content) return null;

  return (
    <WaTextEditor
      handleInputChange={handleInputChange}
      content={content.value}
    />
  );
};
