import { useEffect, useState } from "react";

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

const ScheduleSurveyModal = ({ opened, close, session }) => {
  const [loadProducts, setLoadProducts] = useState(false);
  const [productData, setProductData] = useState([]);

  const form = useForm({
    initialValues: {
      waTemplateId: "",
      event: "",
      isProductSpecific: false,
      productId: "",
      teamId: "",
    },
    validate: {
      waTemplateId: isNotEmpty("Template is required"),
      event: isNotEmpty("Template is required"),
      teamId: isNotEmpty("Team is required"),
      productId: (value, values) =>
        values.isProductSpecific && !value ? "Product is required" : null,
    },
  });
  //get product id list
  const { data: products } = useGetProductsFromShopify(loadProducts);
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
        setLoadProducts(false);
        setProductData([]);
        close();
      },
    });
  };

  useEffect(() => {
    setProductData(
      products
        ? products?.map((product) => ({
            label: product.title,
            value: product.id.toString(),
          }))
        : [],
    );
    setLoadProducts(false);
  }, [products]);

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
                onClick={() => setLoadProducts(true)}
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
