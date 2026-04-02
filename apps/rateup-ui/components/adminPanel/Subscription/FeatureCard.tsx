"use client";

import { ActionIcon, Box, Checkbox, Collapse, Group } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import { SubscriptionFeaturePathName } from "../../../types/enums";
import { getNestedProperty } from "../../../utils/misc/obj.utils";
import { CountRestrictionCards } from "./CountRestrictionCards";
import { FeatureBadge } from "./FeatureBadge";

interface FeatureCardProps {
  featurePathName: SubscriptionFeaturePathName;
  subscriptionForm: any;
}

export function FeatureCard({
  featurePathName,
  subscriptionForm,
}: FeatureCardProps) {
  function handleChange(checked: boolean) {
    if (checked) {
      subscriptionForm.setFieldValue(
        `features.${featurePathName}.active`,
        true,
      );
    } else {
      subscriptionForm.setFieldValue(
        `features.${featurePathName}.active`,
        false,
      );
    }
  }
  const [opened, { toggle }] = useDisclosure(false);

  const feature = getNestedProperty(
    subscriptionForm.values.features,
    featurePathName,
  );

  return (
    <Box
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "white",
      }}
    >
      <Group gap={0} p={"xs"}>
        <Checkbox
          checked={feature.active}
          onChange={(e) => handleChange(e.currentTarget.checked)}
          style={{
            cursor: "pointer",
          }}
          styles={{
            input: {
              cursor: "pointer",
            },
          }}
        />
        <Box style={{ flex: 1, cursor: "pointer" }} onClick={toggle} mx="sm">
          <FeatureBadge featurePathName={featurePathName} />
        </Box>
        <ActionIcon
          onClick={toggle}
          variant="transparent"
          display={Object.keys(feature || {}).length <= 1 ? "none" : "block"}
        >
          {opened ? <IconChevronUp /> : <IconChevronDown />}
        </ActionIcon>
      </Group>
      <Collapse
        expanded={opened}
        style={{
          marginLeft: "56px",
        }}
        pb="xs"
      >
        {Object.keys(feature || {}).map((featureName) => {
          if (featureName === "count") {
            return (
              <CountRestrictionCards
                key={featureName}
                featurePathName={featurePathName}
                subscriptionForm={subscriptionForm}
              />
            );
          }
          if (["active"].includes(featureName)) {
            return;
          } else {
            return (
              <FeatureCard
                key={featureName}
                featurePathName={
                  `${featurePathName}.${featureName}` as SubscriptionFeaturePathName
                }
                subscriptionForm={subscriptionForm}
              />
            );
          }
        })}
      </Collapse>
    </Box>
  );
}
