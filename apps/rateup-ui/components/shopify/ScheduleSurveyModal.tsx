"use client";

import { useState } from "react";

import {
  ActionIcon,
  Alert,
  Checkbox,
  Group,
  Input,
  Stack,
  Text,
  TooltipFloating,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  IntegratedApps,
  LoyaltyApiFeature,
  ShopifyEvents,
} from "@/types/enums";
import { ShopifyIntegration } from "@/types/global";
import { useUpdateIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { getProductsFromShopify } from "@/backend/appsIntegration/shopify/shopify.api";

import useTemplatesAvailableForTeam from "../../hooks/team";
import { shopifyEventData } from "../../utils/constants";
import { showLoadingToast } from "../../utils/notifications";
import {
  ContainedNumberInput,
  ContainedSelection,
} from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";
import WaTemplateSelector from "../input/WaTemplateSelector";
import { LASelector } from "../LoyaltyComponents/utils";
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
      timeDelay: 0,
      repeatInterval: {
        value: 0,
        unit: "hour",
      },
      actionId: "",
      loyaltyApiFeature: "",
    },
    validate: {
      event: isNotEmpty("Event is required"),
      teamId: isNotEmpty("Team is required"),
      productId: (value, values) =>
        values.isProductSpecific && !value ? "Product is required" : null,
      timeDelay: (value) =>
        value < 60 && value !== 0
          ? "Minimum time delay should be 60 minutes. You can set to 0 if not needed"
          : null,
    },
  });
  const translations = useTranslations();
  const updateIntegration = useUpdateIntegrationMutation(
    IntegratedApps.shopify,
  );

  const handleScheduleSurvey = () => {
    if (form.validate().hasErrors) return;
    if (
      !form.values.waTemplateId &&
      !form.values.actionId &&
      !form.values.loyaltyApiFeature
    ) {
      form.setErrors({
        actionId: translations(
          "Choose Loyalty API/Action or Whatsapp Template",
        ),
        waTemplateId: translations(
          "Choose Loyalty API/Action or Whatsapp Template",
        ),
        loyaltyApiFeature: translations(
          "Choose Loyalty API/Action or Whatsapp Template",
        ),
      });
      return;
    }
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
      translations("Creating Survey Schedule"),
      "integration-update",
      true,
      translations("Loading"),
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
      buttonTitle={translations("Create")}
      includeCancelButton
      size="lg"
      submitButtonDisabled={
        form.values.event &&
        form.values.event !== ShopifyEvents.ABANDONED_CHECKOUTS &&
        !shopifyInfo.credential.isWebhookRegistered
      }
    >
      <Stack>
        <Alert
          title={translations("Important")}
          display={
            form.values.event &&
            form.values.event !== ShopifyEvents.ABANDONED_CHECKOUTS &&
            !shopifyInfo.credential.isWebhookRegistered
              ? "block"
              : "none"
          }
          icon={<IconAlertCircle color="red" />}
          color="red"
        >
          {translations(
            "Allow rateup to subscribe to your store events in th settings before scheduling survey",
          ) ||
            "Allow rateup to subscribe to your store events in th settings before scheduling survey"}
        </Alert>
        <TeamSelector
          placeholder={translations("Select Team")}
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
          label={translations("Event")}
          placeholder={translations("Select Shopify Event")}
          data={shopifyEventData}
          {...form.getInputProps("event")}
        />
        <WaTemplateSelector
          label={translations("whatsApp Template")}
          placeholder={translations("Select a template")}
          {...form.getInputProps("waTemplateId")}
        />
        <ContainedNumberInput
          label={translations("Time Delay (in minutes)")}
          {...form.getInputProps("timeDelay")}
          allowDecimal={false}
          allowNegative={false}
          display={form.values.waTemplateId ? "block" : "none"}
        />
        <LASelector
          label={translations("Loyalty Action")}
          placeholder={translations("Select action")}
          {...form.getInputProps("actionId")}
          display={
            form.values.event === ShopifyEvents.ABANDONED_CHECKOUTS
              ? "none"
              : "block"
          }
        />
        <ContainedSelection
          label={"Loyalty API"}
          {...form.getInputProps("loyaltyApiFeature")}
          placeholder="Select an API Feature"
          data={Object.values(LoyaltyApiFeature)}
        />

        {form.values.event === ShopifyEvents.ABANDONED_CHECKOUTS ? (
          <Input.Wrapper>
            <Input.Label>
              <Text size="xs">Repeat interval</Text>
            </Input.Label>
            <Group>
              <ContainedNumberInput
                {...form.getInputProps("repeatInterval.value")}
                allowDecimal={false}
                allowNegative={false}
              />
              <ContainedSelection
                data={["hour", "day"]}
                {...form.getInputProps("repeatInterval.unit")}
              />
            </Group>
          </Input.Wrapper>
        ) : (
          <Stack>
            <Checkbox
              label={translations("Product Specific")}
              {...form.getInputProps("isProductSpecific")}
            />
            {form.values.isProductSpecific && (
              <Group>
                <ContainedSelection
                  label={translations("Product")}
                  data={productData}
                  placeholder={translations("Select a product")}
                  flex={1}
                  {...form.getInputProps("productId")}
                />
                <TooltipFloating label={translations("Load products")}>
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
        )}
      </Stack>
    </FormModalLayout>
  );
};

export default ScheduleSurveyModal;
