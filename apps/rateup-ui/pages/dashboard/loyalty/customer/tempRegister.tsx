import { useRouter } from "next/router";
import {
  useCreateCampaignMutation,
  usePublicCampaign,
} from "../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import { Button, Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { ContainedTextField } from "../../../../components/input/ContainedInput/ContainedInput";
import { useCreateLoyaltyCustomerMutation } from "../../../../backend/loyalty/customer/customer.query";

export default function RegisterLCampaignPage() {
  const router = useRouter();
  const lcampaignId = router.query.lcampaignId as string;

  const { data: campaign } = usePublicCampaign(lcampaignId);

  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
    },
    validate: {
      phone: (ph) => ph.length !== 12 && "Enter country code & number", // TODO: add proper validation,
      name: (name) => name.length === 0 && "Must not be empty",
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
        <Title>Registration Form for: {campaign.name}</Title>
        <ContainedTextField {...form.getInputProps("name")} label="Name" />
        <ContainedTextField {...form.getInputProps("phone")} label="Phone" />
        <Group>
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </Group>
      </Stack>
    </Paper>
  );
}
