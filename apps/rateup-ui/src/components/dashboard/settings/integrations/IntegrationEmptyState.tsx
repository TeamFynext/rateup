import type { ComponentType, ReactNode } from "react";

import { Card } from "@/components/ui/card.tsx";

import { IntegrationPlate } from "./IntegrationPlate.tsx";

/**
 * The "not connected yet" state, shared by every integration. It replaced eleven different
 * takes on the same screen, two of which were stock photography sized by hand.
 *
 * `benefits` is what the admin gets, in their words, not the vendor's — keep it to three
 * lines, since a fourth is nobody's reason to connect anything.
 */
export function IntegrationEmptyState({
  icon,
  title,
  description,
  benefits,
  action,
}: Readonly<{
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  benefits?: readonly string[];
  action: ReactNode;
}>) {
  return (
    <Card className="border border-dashed bg-transparent shadow-none ring-0">
      <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <IntegrationPlate icon={icon} />

        <div className="flex max-w-md flex-col gap-1.5">
          <h3 className="font-heading text-lg font-medium">{title}</h3>
          <p className="text-sm/relaxed text-muted-foreground">{description}</p>
        </div>

        {benefits && benefits.length > 0 && (
          <ul className="flex max-w-md flex-col gap-1 text-sm text-muted-foreground">
            {benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        )}

        {action}
      </div>
    </Card>
  );
}
