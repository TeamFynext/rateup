import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useAllSubscriptions } from "../../backend/subscription/subscription.query";
import dayjs from "dayjs";
import { Group, Skeleton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { SubscriptionEditorModal } from "../../components/adminPanel/Subscription/SubscriptionEditorModal";
import { FeatureBadge } from "../../components/adminPanel/Subscription/FeatureBadge";
import { SubscriptionFeaturePathName } from "../../types/enums";
import styles from "../../components/adminPanel/admin.module.css";

const columns: GridColDef[] = [
  {
    field: "orgId",
    headerName: "OrgId",
    width: 220,
    cellClassName: styles.idCell,
  },
  { field: "orgName", headerName: "OrgName", width: 220 },
  {
    field: "features",
    headerName: "Features",
    minWidth: 300,
    flex: 1,
    renderCell: renderFeatures,
  },
  { field: "createdAt", headerName: "Created At", width: 120 },
  { field: "renewedAt", headerName: "Renewed At", width: 120 },
  { field: "expiresAt", headerName: "Expires At", width: 120 },
];
export default function () {
  const {
    data: subscriptions,
    isLoading: isSubscriptionsLoading,
    isError: isSubscriptionsError,
  } = useAllSubscriptions();
  if (isSubscriptionsError) return <div>error occured</div>;

  const rows = subscriptions?.map((subscription) => {
    return {
      id: subscription.orgId,
      orgId: (subscription as any).org.id,
      orgName: (subscription as any).org.name,
      features: subscription,
      createdAt: dayjs(subscription.createdAt).format("YYYY/MM/DD"),
      renewedAt: subscription.renewedAt
        ? dayjs(subscription.renewedAt).format("YYYY/MM/DD")
        : "",
      expiresAt: dayjs(subscription.expiresAt).format("YYYY/MM/DD"),
    };
  });
  return (
    <div>
      <h1>Subscriptions</h1>
      {isSubscriptionsLoading ? (
        <Skeleton height={500} />
      ) : (
        <DataGrid rows={rows} columns={columns} getRowHeight={() => "auto"} />
      )}
    </div>
  );
}

function renderFeatures(params: GridRenderCellParams<any, Subscription>) {
  const subscription = params.value;
  const features = subscription.features;
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Group
      py={"md"}
      onClick={open}
      style={{
        cursor: "pointer",
      }}
    >
      {Object.keys(features)
        .filter((feature) => features[feature].active)
        .map((feature: SubscriptionFeaturePathName) => {
          return <FeatureBadge key={feature} featurePathName={feature} />;
        })}
      <SubscriptionEditorModal
        opened={opened}
        onClose={close}
        subscription={subscription}
      />
    </Group>
  );
}
