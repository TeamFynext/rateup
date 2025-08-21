import React, { useState } from "react";

import { Box, Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { DataGrid } from "@mui/x-data-grid";
import { useTranslations } from "next-intl";

import {
  usePaymentsPlans,
  useRateupPaymentsPlanDeleteMutation,
  useRateupPaymentsPlanMutation,
  useRateupPaymentsPlans,
  useRateupPaymentsPlanUpdateMutation,
} from "../../../backend/payment/payment.query";
import { useGetStripeProducts } from "../../../backend/payment/stripe/stripe.query";
import { generateColumns } from "../../../components/adminPanel/RateUpPlans/RateUpPlanColumn";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { ContainedTagInput } from "../../../components/input/ContainedInput/ContainedInput";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import RateupPlanModal from "../../../components/Modal/RateupPlanModal";
import { showLoadingToast } from "../../../utils/notifications";

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
  const translations = useTranslations();
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
      translations("Hold.. your data is getting updated..."),
      "load-data",
      true,
      translations("Updating RateUp Plan"),
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
        <Title order={2}>{translations("Rateup Plans")}</Title>
        <RateupButtonPrimary
          title={translations("Create A Plan")}
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
          showToolbar
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
        title={translations("Update Description")}
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
            label={translations("Description")}
            placeholder={translations("Type Description and press enter")}
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
