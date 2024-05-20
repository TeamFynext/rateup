import { Box, Stack, Title, Group } from "@mantine/core";
import React, { useState } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
  usePaymentsPlans,
  useRateupPaymentsPlanDeleteMutation,
  useRateupPaymentsPlanMutation,
  useRateupPaymentsPlanUpdateMutation,
  useRateupPaymentsPlans,
} from "../../../backend/payment/payment.query";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { IconPlus } from "@tabler/icons-react";
import RateupPlanModal from "../../../components/Modal/RateupPlanModal";
import { useDisclosure } from "@mantine/hooks";
import { showLoadingToast } from "../../../utils/notifications";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { ContainedTagInput } from "../../../components/input/ContainedInput/ContainedInput";
import { generateColumns } from "../../../components/adminPanel/RateUpPlans/RateUpPlanColumn";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import { useGetStripeProducts } from "../../../backend/payment/stripe/stripe.query";

export enum PaymentPlans {
  razorpay = "Razorpay Plans",
  stripe = "Stripe Products",
}
const RateupPlan = () => {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [error, setError] = useState("");
  const [updatedField, setUpdatedField] = useState<any>("");
  const [
    openedDescriptonModal,
    { toggle: toggleDescriptonModal, close: closeDescriptonModal },
  ] = useDisclosure(false);

  const { data: plans, isPending, isError } = useRateupPaymentsPlans();
  const {
    data: razorPayPlans,
    isPending: isRazorPayPlansLoading,
    isError: isRazorPayPlansError,
  } = usePaymentsPlans();
  const { data: stripeProducts } = useGetStripeProducts();
  const rateupPaymentsPlanMutation = useRateupPaymentsPlanMutation(close);
  const rateupPaymentsPlanUpdateMutation =
    useRateupPaymentsPlanUpdateMutation(closeDescriptonModal);
  const rateupPaymentsPlanDelete = useRateupPaymentsPlanDeleteMutation();

  if (isError || isRazorPayPlansError) return <div>error occured</div>;
  if (isPending || isRazorPayPlansLoading) return <RateupLoader h={"100dvh"} />;

  const razorPayPlanFiltered =
    razorPayPlans?.data
      // ?.filter(
      //   (razorPlan) =>
      //     !plans.some((plan) => plan.paymentPlanId === razorPlan.id)
      // )
      .map((filteredPlan) => ({
        value: filteredPlan.id,
        label: filteredPlan.name,
      })) ?? [];
  const formattedStripeProducts = stripeProducts?.map((product) => ({
    value: product.id,
    label: product.name,
  }));

  const handleCellEditStopUpdate = (cellData) => {
    if (cellData?.colDef?.type === "singleSelect" || !updatedField) return;

    const updatedData: any = {
      id: cellData?.row?.id,
      paymentPlanId: cellData?.row?.paymentPlanId,
      [cellData.field]: updatedField,
    };
    handleMutation(updatedData);
  };

  const handleDoubleClick = (params) => {
    if (params?.field === "description") {
      toggleDescriptonModal();
      setUpdatedField({
        id: params?.row?.id,
        paymentPlanId: params?.row?.paymentPlanId,
        [params.field]: params?.value,
      });
    }
  };
  const rows = plans?.map((plan) => {
    return {
      id: plan.id,
      displayName: plan.displayName,
      name: plan.name,
      description: plan.description,
      displayWidgetId: plan.displayWidgetId?.length
        ? plan.displayWidgetId
        : "Nil",
      features: plan,
      planType: plan.planType,
      paymentPlanId: plan.paymentPlanId,
      stripeId: plan.stripeId,
      createdAt: plan?.createdAt,
    };
  });
  const handleMutation = (updatedData) => {
    rateupPaymentsPlanUpdateMutation.mutate(updatedData);
    showLoadingToast(
      "Hold.. your data is getting updated...",
      "load-data",
      true,
      "Updating RateUp Plan",
    );
    setUpdatedField("");
  };
  const planList = [
    { group: PaymentPlans.razorpay, items: razorPayPlanFiltered },
    { group: PaymentPlans.stripe, items: formattedStripeProducts },
  ];

  return (
    <Stack mah={"100%"}>
      <Group gap={"md"} justify="space-between" mr={"xl"}>
        <Title order={2}>Rateup Plans</Title>
        <RateupButtonPrimary
          title={"Create A Plan"}
          rightIcon={<IconPlus size={16} />}
          onClick={toggle}
        />
        <RateupPlanModal opened={opened} close={close} planList={planList} />
      </Group>
      <Box h="75vh">
        <DataGrid
          rows={rows}
          columns={generateColumns(
            razorPayPlanFiltered,
            formattedStripeProducts,
            handleMutation,
            setUpdatedField,
            rateupPaymentsPlanDelete,
          )}
          getRowHeight={() => "auto"}
          disableColumnSelector
          disableDensitySelector
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          onCellEditStop={handleCellEditStopUpdate}
          onCellDoubleClick={handleDoubleClick}
        />
      </Box>
      <FormModalLayout
        opened={openedDescriptonModal}
        onClose={() => {
          closeDescriptonModal();
          setUpdatedField("");
        }}
        centered
        title="Update Description"
        buttonTitle="Update"
        includeCancelButton
        onSubmit={() => {
          if (!updatedField?.description.length) {
            setError("Cannot be empty");
            return;
          }
          handleMutation(updatedField);
        }}
      >
        <Group mt="md" justify="space-between">
          <ContainedTagInput
            label="Description"
            placeholder="Type Description and press enter"
            withAsterisk
            value={updatedField?.description ?? []}
            onChange={(e) => {
              if (!e) return;
              setError("");
              setUpdatedField({
                ...updatedField,
                description: e,
              });
            }}
            error={error}
          />
        </Group>
      </FormModalLayout>
    </Stack>
  );
};

export default RateupPlan;
