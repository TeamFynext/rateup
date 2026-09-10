import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";

import { SectionHeading } from "../../StepChrome.tsx";
import type { StepTone } from "../../wizardSteps.ts";

interface RewardGroupProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: StepTone;
  /** Field-array indices that belong to this group, in order. */
  indices: readonly number[];
  emptyTitle: string;
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  children: (index: number) => React.ReactNode;
}

/** One band of rewards — for everyone, or VIP-only — with its own Add button. */
export function RewardGroup({
  title,
  description,
  icon,
  tone,
  indices,
  emptyTitle,
  emptyText,
  addLabel,
  onAdd,
  children,
}: Readonly<RewardGroupProps>) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        icon={icon}
        tone={tone}
        title={title}
        description={description}
        action={
          indices.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={onAdd}>
              <IconPlus size={14} />
              {addLabel}
            </Button>
          ) : undefined
        }
      />

      {indices.length === 0 ? (
        <Empty className="rounded-lg border border-dashed py-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyText}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" size="sm" onClick={onAdd}>
              <IconPlus size={16} />
              {t("Add a reward")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">{indices.map((index) => children(index))}</div>
      )}
    </section>
  );
}
