import { useEffect, useState } from "react";

import { getProductsFromShopify } from "@/backend/shopify/shopify.api";
import {
  ActionIcon,
  Alert,
  Blockquote,
  Checkbox,
  Group,
  Stack,
  TooltipFloating,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";

import { ShopifySendAfter } from "@/types/enums";

import {
  useCreateShopifySurveySchedule,
  useGetProductsFromShopify,
} from "../../backend/shopify/shopify.query";
import useTemplatesAvailableForTeam from "../../hooks/team";
import { shopifyEventData } from "../../utils/constants";
import { showLoadingToast } from "../../utils/notifications";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";
import FormModalLayout from "../Modal/FormModalLayout";

const ScheduleSurveyModal = ({
  opened,
  close,
  session,
  setShopifyProducts,
}) => {
  const [productData, setProductData] = useState([]);

  const form = useForm({
    initialValues: {
      waTemplateId: "",
      event: "",
      isProductSpecific: false,
      productId: "",
      teamId: "",
      sendAfter: ShopifySendAfter.TwoHour,
    },
    validate: {
      waTemplateId: isNotEmpty("Template is required"),
      event: isNotEmpty("Template is required"),
      teamId: isNotEmpty("Team is required"),
      productId: (value, values) =>
        values.isProductSpecific && !value ? "Product is required" : null,
      sendAfter: isNotEmpty("send After is required"),
    },
  });

  const createShopifySurveySchedule = useCreateShopifySurveySchedule();

  //get wa templates from db
  const templates = useTemplatesAvailableForTeam(form.values.teamId);
  if (
    form.values.waTemplateId &&
    templates?.length &&
    !templates.map((t) => t.id).includes(form.values.waTemplateId)
  ) {
    form.setFieldValue("waTemplateId", "");
  }
  const templatesData = templates?.map((t) => {
    return {
      value: t?.id,
      label: t?.data?.name,
    };
  });

  const handleScheduleSurvey = () => {
    if (form.validate().hasErrors) return;
    showLoadingToast(
      "Survey Schedule is creating",
      "shopify-survey",
      true,
      "Loading",
    );
    createShopifySurveySchedule.mutate(form.values, {
      onSuccess: () => {
        form.reset();
        close();
      },
    });
  };

  const loadShopifyProducts = async () => {
    const products = await getProductsFromShopify();
    setShopifyProducts(products ?? []);
    setProductData(
      products
        ? products?.map((product) => ({
            label: product.title,
            value: product.id.toString(),
          }))
        : [],
    );
  };
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title=""
      centered
      onSubmit={handleScheduleSurvey}
      buttonTitle="Create"
      includeCancelButton
      size="lg"
      submitButtonDisabled={!session.isWebhookRegistered}
    >
      <Stack>
        <Alert
          title={"Important"}
          display={!session.isWebhookRegistered ? "block" : "none"}
          icon={<IconAlertCircle color="red" />}
          color="red"
        >
          Register webhooks before scheduling survey
        </Alert>
        <TeamSelector
          placeholder="Select Team"
          withAsterisk
          allowDeselect={false}
          disabled={false}
          value={form?.getInputProps("teamId")?.value || ""}
          {...form.getInputProps("teamId")}
          styles={{
            input: { outline: "1px solid #149A8A" },
          }}
          searchable
        />
        <ContainedSelection
          label={"Event"}
          placeholder="Select Shopify Event"
          data={shopifyEventData}
          {...form.getInputProps("event")}
        />
        <ContainedSelection
          label={"whatsApp Template"}
          placeholder="Select a template"
          data={templatesData}
          {...form.getInputProps("waTemplateId")}
        />
        <ContainedSelection
          label={"Send After"}
          placeholder="Select"
          data={Object.values(ShopifySendAfter)}
          {...form.getInputProps("sendAfter")}
        />
        <Checkbox
          label={"Product Specific"}
          {...form.getInputProps("isProductSpecific")}
        />
        {form.values.isProductSpecific && (
          <Group>
            <ContainedSelection
              label={"Product"}
              data={productData}
              placeholder="Select a product"
              flex={1}
              {...form.getInputProps("productId")}
            />
            <TooltipFloating label={"Load products"}>
              <ActionIcon
                onClick={loadShopifyProducts}
                variant="subtle"
                mt={"lg"}
              >
                <IconRefresh />
              </ActionIcon>
            </TooltipFloating>
          </Group>
        )}
      </Stack>
    </FormModalLayout>
  );
};

export default ScheduleSurveyModal;
