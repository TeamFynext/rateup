import { useRouter } from "next/router";

import { Button, Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";

import useTranslations from "@/dictionaries/useTranslation";

import {
  useCreateCampaignMutation,
  usePublicCampaign,
} from "../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import { useCreateLoyaltyCustomerMutation } from "../../../../backend/loyalty/customer/customer.query";
import { ContainedTextField } from "../../../../components/input/ContainedInput/ContainedInput";

export default function RegisterLCampaignPage() {
  const router = useRouter();
  const lcampaignId = router.query.lcampaignId as string;
  const { translations } = useTranslations();
  const { data: campaign } = usePublicCampaign(lcampaignId);

  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
    },
    validate: {
      phone: (ph) =>
        ph.length !== 12 && translations["Enter country code & number"], // TODO: add proper validation,
      name: (name) => name.length === 0 && translations["Must not be empty"],
    },
  });

  const createMutation = useCreateLoyaltyCustomerMutation();

  function handleSubmit() {
    if (!form.validate().hasErrors) {
      createMutation.mutate(form.values);
    }
  }
  if (!campaign) return;

  return (
    <Paper p="sm">
      <Stack>
        <Title>
          {translations["Registration Form for: "]}
          {campaign.name}
        </Title>
        <ContainedTextField
          {...form.getInputProps("name")}
          label={translations["Name"]}
        />
        <ContainedTextField
          {...form.getInputProps("phone")}
          label={translations["Phone"]}
        />
        <Group>
          <Button variant="outline">{translations["Cancel"]}</Button>
          <Button onClick={handleSubmit}>{translations["Submit"]}</Button>
        </Group>
      </Stack>
    </Paper>
  );
}
