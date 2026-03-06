import { Group, NumberInput, Text } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";

import { getNestedProperty } from "../../../utils/misc/obj.utils";

interface CountRestrictionCardsProps {
  featurePathName: string;
  subscriptionForm: UseFormReturnType<
    Pick<Subscription, "features" | "expiresAt">
  >;
}
export function CountRestrictionCards({
  featurePathName,
  subscriptionForm,
}: CountRestrictionCardsProps) {
  const feature = getNestedProperty(
    subscriptionForm.values.features,
    featurePathName,
  );
  return (
    <>
      {Object.keys(feature.count).map((property: "max" | "min") => {
        return (
          <Group key={property} p="sm">
            <div style={{ flex: 1 }}>
              <Text>{property}</Text>
            </div>
            <NumberInput
              value={feature.count[property]}
              onChange={(value) => {
                subscriptionForm.setFieldValue(
                  `features.${featurePathName}.count.${property}`,
                  value,
                );
              }}
            />
          </Group>
        );
      })}
    </>
  );
}
