import { Stack } from "@mantine/core";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import FormModalLayout from "../Modal/FormModalLayout";
import { useState } from "react";

const ConnectShopifyModal = ({ opened, close }) => {
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
      window.open(`http://localhost:3001/api/shopify?shop=${shop}`);
      setShop("");
      //ToDo auth error page
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
      buttonTitle="Connect"
      includeCancelButton
      centered
      size="md"
    >
      <Stack>
        <ContainedTextField
          label={"Shopify Store name"}
          placeholder="example.myshopify.com"
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
