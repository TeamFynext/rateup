import { useRouter } from "next/router";

import {
  Button,
  Group,
  NumberInput,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";

import useTranslations from "@/dictionaries/useTranslation";

import { useCreateRewardEventMutation } from "../../../../../backend/loyalty/campaign/campaignRewardEvent/care.query";
import { useCampaign } from "../../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import { LoyaltyCampaignType } from "../../../../../types/enums";

export default function CampaignEventEntryPage() {
  const router = useRouter();
  const lcampaignId = router.query.campaignId as string;
  const { data: campaign } = useCampaign(lcampaignId);
  const { translations } = useTranslations();
  const form = useForm({
    initialValues: {
      referralCode: "",
      phone: "",
      transactionAmount: 0,
    },
    validate: {
      phone: (ph) => (!ph ? translations["Must Enter phone"] : null),
    },
  });

  const createMutation = useCreateRewardEventMutation(lcampaignId);

  function handleSubmit() {
    if (form.validate().hasErrors) return;

    createMutation.mutate(form.values, {
      onSuccess: () => {
        form.reset();
      },
    });
  }

  if (!campaign) return;

  const hasReferrer = campaign.type !== LoyaltyCampaignType.Transaction;
  const hasTransaction = campaign.type !== LoyaltyCampaignType.Referral;

  return (
    <div>
      <Stack>
        <Title>{translations["Manually Record Transaction Event"]}</Title>

        {hasReferrer && (
          <TextInput
            {...form.getInputProps("referralCode")}
            label={translations["Referral Code"]}
          />
        )}
        {/* TODO: show suggestions of existing phone numbers? */}
        <TextInput
          {...form.getInputProps("phone")}
          label={translations["Phone number of customer"]}
        />
        {hasTransaction && (
          <NumberInput
            {...form.getInputProps("transactionAmount")}
            label={translations["Transaction Amount"]}
          />
        )}

        <Group justify="space-between" mt="md">
          <Button size="lg" variant={"light"} onClick={() => form.reset()}>
            {translations["Reset"]}
          </Button>
          <Button onClick={handleSubmit} size="lg" disabled={!form.isValid()}>
            {translations["Submit"]}
          </Button>
        </Group>
      </Stack>
    </div>
  );
}
