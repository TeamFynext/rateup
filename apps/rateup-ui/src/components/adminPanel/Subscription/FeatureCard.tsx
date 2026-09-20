import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import type { Control } from "react-hook-form";
import { useController, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import type { SubscriptionFeaturePathName } from "@/types/enums.ts";
import { getNestedProperty } from "@/utils/misc/obj.utils";

import { CountRestrictionCards } from "./CountRestrictionCards.tsx";
import { FeatureBadge } from "./FeatureBadge.tsx";
import type { SubscriptionFormValues } from "./SubscriptionEditorModal.tsx";

interface FeatureCardProps {
  featurePathName: SubscriptionFeaturePathName;
  control: Control<SubscriptionFormValues>;
}

export function FeatureCard({ featurePathName, control }: Readonly<FeatureCardProps>) {
  const { field: activeField } = useController({
    control,
    name: `features.${featurePathName}.active`,
  });
  const [opened, { toggle }] = useDisclosure(false);

  const features = useWatch({ control, name: "features" });
  const feature = getNestedProperty(features, featurePathName);

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center p-2">
        <Checkbox
          className="cursor-pointer"
          checked={activeField.value}
          onCheckedChange={(checked) => activeField.onChange(checked)}
        />
        <button type="button" className="mx-3 flex-1 cursor-pointer text-left" onClick={toggle}>
          <FeatureBadge featurePathName={featurePathName} />
        </button>
        {Object.keys(feature || {}).length > 1 && (
          <Button aria-label="Collapse" variant="ghost" size="icon" onClick={toggle}>
            {opened ? <IconChevronUp /> : <IconChevronDown />}
          </Button>
        )}
      </div>
      <Collapsible open={opened}>
        <CollapsibleContent className="ml-14 pb-2">
          {Object.keys(feature || {}).map((featureName) => {
            if (featureName === "count") {
              return (
                <CountRestrictionCards
                  key={featureName}
                  featurePathName={featurePathName}
                  control={control}
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
                  control={control}
                />
              );
            }
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
