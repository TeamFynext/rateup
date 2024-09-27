import { useState } from "react";

import {
  ActionIcon,
  Alert,
  Checkbox,
  Group,
  Stack,
  TooltipFloating,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";

import { IntegratedApps, ShopifySendAfter } from "@/types/enums";
import { ShopifyIntegration } from "@/types/global";
import { useUpdateIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { getProductsFromShopify } from "@/backend/appsIntegration/shopify/shopify.api";
import useTranslations from "@/dictionaries/useTranslation";

import useTemplatesAvailableForTeam from "../../hooks/team";
import { shopifyEventData } from "../../utils/constants";
import { showLoadingToast } from "../../utils/notifications";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";
import FormModalLayout from "../Modal/FormModalLayout";

const ScheduleSurveyModal = ({
  opened,
  close,
  shopifyInfo,
  setShopifyProducts,
}: {
  opened: boolean;
  close: () => void;
  shopifyInfo: ShopifyIntegration;
  setShopifyProducts: React.Dispatch<React.SetStateAction<any[]>>;
}) => {
  const [productData, setProductData] = useState([]);

  const form = useForm({
    initialValues: {
      waTemplateId: "",
      event: null,
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
  const { translations } = useTranslations();
  const updateIntegration = useUpdateIntegrationMutation(
    IntegratedApps.shopify,
  );

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
    const newShopifySurveys = [...shopifyInfo.credential.shopifySurveys];
    const isEventExist = newShopifySurveys.find(
      (s) => s.event === form.values.event,
    );
    if (isEventExist) {
      form.setFieldError("event", "You have a schedule in this event");
      return;
    }
    newShopifySurveys.push({
      ...form.values,
      active: true,
      schedules: [],
      createdAt: new Date(),
    });
    showLoadingToast(
      translations["Creating Survey Schedule"],
      "integration-update",
      true,
      translations["Loading"],
      "",
      false,
    );
    updateIntegration.mutate(
      {
        credential: {
          ...shopifyInfo.credential,
          shopifySurveys: newShopifySurveys,
        },
      },
      {
        onSuccess: () => {
          form.reset();
          close();
        },
      },
    );
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
      onClose={() => {
        form.reset();
        close();
      }}
      title=""
      centered
      onSubmit={handleScheduleSurvey}
      buttonTitle={translations["Create"]}
      includeCancelButton
      size="lg"
      submitButtonDisabled={!shopifyInfo.credential.isWebhookRegistered}
    >
      <Stack>
        <Alert
          title={translations["Important"]}
          display={
            !shopifyInfo.credential.isWebhookRegistered ? "block" : "none"
          }
          icon={<IconAlertCircle color="red" />}
          color="red"
        >
          {
            translations[
              "Allow rateup to subscribe to your store events in th settings before scheduling survey"
            ]
          }
        </Alert>
        <TeamSelector
          placeholder={translations["Select Team"]}
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
          label={translations["Event"]}
          placeholder={translations["Select Shopify Event"]}
          data={shopifyEventData}
          {...form.getInputProps("event")}
        />
        <ContainedSelection
          label={translations["whatsApp Template"]}
          placeholder={translations["Select a template"]}
          data={templatesData}
          {...form.getInputProps("waTemplateId")}
        />
        <ContainedSelection
          label={translations["Send After"]}
          placeholder={translations["Select"]}
          data={Object.values(ShopifySendAfter)}
          {...form.getInputProps("sendAfter")}
        />
        <Checkbox
          label={translations["Product Specific"]}
          {...form.getInputProps("isProductSpecific")}
        />
        {form.values.isProductSpecific && (
          <Group>
            <ContainedSelection
              label={translations["Product"]}
              data={productData}
              placeholder={translations["Select a product"]}
              flex={1}
              {...form.getInputProps("productId")}
            />
            <TooltipFloating label={translations["Load products"]}>
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
