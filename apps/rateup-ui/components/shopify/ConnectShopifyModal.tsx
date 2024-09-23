import { useState } from "react";

import { Stack } from "@mantine/core";
import { API_URL } from "utils/constants";

import useTranslations from "@/dictionaries/useTranslation";

import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import FormModalLayout from "../Modal/FormModalLayout";

const ConnectShopifyModal = ({ opened, close }) => {
  const { translations } = useTranslations();
  const [shop, setShop] = useState("");
  const [error, setError] = useState("");
  const handleShopifyInstallation = async () => {
    if (!shop) {
      setError("Shop is required");
      return;
    }
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com/;
    if (regex.test(shop)) {
      close();
      window.open(
        `${API_URL}/api/public/integrations/shopify/auth?shop=${shop}`,
      );
      setShop("");
    } else {
      setError("Invalid shop name");
    }
  };
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title=""
      onSubmit={handleShopifyInstallation}
      buttonTitle={translations["Connect"]}
      includeCancelButton
      centered
      size="md"
    >
      <Stack>
        <ContainedTextField
          label={translations["Shopify Store name"]}
          placeholder={translations["example.myshopify.com"]}
          value={shop}
          onChange={(e) => {
            setError("");
            setShop(e.currentTarget.value);
          }}
          error={error}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default ConnectShopifyModal;
