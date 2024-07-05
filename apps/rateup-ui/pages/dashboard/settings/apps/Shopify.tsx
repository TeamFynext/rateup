import { Checkbox, Stack, Title } from "@mantine/core";
import React from "react";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import FormModalLayout from "../../../../components/Modal/FormModalLayout";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { ContainedSelection } from "../../../../components/input/ContainedInput/ContainedInput";
import { ShopifyEvents } from "../../../../types/enums";
import {
  useWaFlowFromDb,
  useWaFlowsFromDb,
} from "../../../../backend/whatsapp/flow/flow.query";
import { useGetProductsFromShopify } from "../../../../backend/shopify/shopify.query";

const Shopify = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const form = useForm({
    initialValues: {
      surveyId: "",
      event: "",
      isProductSpecific: false,
      productId: "",
    },
  });

  const handleScheduleSurvey = () => {};
  return (
    <Stack>
      {/* TODO: connect shopify store */}
      <PaperLayout>
        <Title order={3}>Survey Delivery settings</Title>
        <RateupButtonBlue title="schedule survey" onClick={open} />
      </PaperLayout>
      <PaperLayout></PaperLayout>
      <FormModalLayout
        opened={opened}
        onClose={close}
        title=""
        centered
        onSubmit={handleScheduleSurvey}
        buttonTitle="Create"
        includeCancelButton
      >
        <ScheduleSurveyModal />
      </FormModalLayout>
    </Stack>
  );
};

const ScheduleSurveyModal = () => {
  //get product id list
  const { data: products } = useGetProductsFromShopify();
  const { data: flows } = useWaFlowsFromDb();
  const flowData = flows
    ? flows.map((flow) => ({ label: flow.name, value: flow.flowId }))
    : [];

  const shopifyEventData = [
    { label: "On Order Create", value: ShopifyEvents.ORDERS_CREATE },
    { label: "On Carts create", value: ShopifyEvents.CARTS_CREATE },
    { label: "On Carts update", value: ShopifyEvents.CARTS_UPDATE },
  ];

  return (
    <Stack>
      <ContainedSelection
        label={"Event"}
        placeholder="Select Event"
        data={shopifyEventData}
      />
      <ContainedSelection
        label={"Survey"}
        placeholder="Select Survey"
        data={flowData}
      />
      <Checkbox label={"Product Specific"} />
      <ContainedSelection label={"Product Id"} />
    </Stack>
  );
};
export default Shopify;
