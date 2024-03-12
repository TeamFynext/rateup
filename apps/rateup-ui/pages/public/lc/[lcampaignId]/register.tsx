import { useRouter } from "next/router";
import {
  usePublicCampaign,
  useRegisterCampaignMutation,
} from "../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import { Button, Group, Paper, Stack, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { ContainedTextField } from "../../../../components/input/ContainedInput/ContainedInput";

export default function RegisterLCampaignPage() {
  const router = useRouter();
  const lcampaignId = router.query.lcampaignId as string;

  const { data: campaign } = usePublicCampaign(lcampaignId);

  const form = useForm({
    initialValues: {
      phone: "",
    },
    validate: {
      phone: (ph) => ph.length !== 12 && "Enter country code & number", // TODO: add proper validation,
    },
  });

  const registerMutation = useRegisterCampaignMutation();

  function handleSubmit() {
    if (!form.validate().hasErrors) {
      registerMutation.mutate({
        campaignId: lcampaignId,
        phone: form.values.phone,
      });
    }
  }
  if (!campaign) return;

  return (
    <Paper p="sm">
      <Stack>
        <Title>Registration Form for: {campaign.name}</Title>
        k <ContainedTextField {...form.getInputProps("phone")} label="Phone" />
        <Group>
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </Group>
      </Stack>
    </Paper>
  );
}
