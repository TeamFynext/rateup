"use client";

import { useExtracted } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

import { formatedTime } from "../../../utils/dateTime";
import { ItemDisplay } from "../item/ItemDisplay";

interface CategoryDisplayProps {
  readonly category: FullCategory;
  readonly setSelectedItem: (item: MenuItem) => void;
  readonly currency: string;
  readonly hideUnavailableCategory: boolean;
  readonly registerCategoryRef: (
    categoryId: string,
    element: HTMLDivElement | null,
  ) => void;
}

export function CategoryDisplay({
  category,
  setSelectedItem,
  currency,
  hideUnavailableCategory,
  registerCategoryRef,
}: Readonly<CategoryDisplayProps>) {
  const {
    categoryDisabled,
    formattedStartTimeWithAmPm,
    formattedEndTimeWithAmPm,
  } = formatedTime(category);
  const translations = useExtracted();
  return (
    <div
      ref={(el) => {
        registerCategoryRef(category.id, el);
      }}
      className="scroll-mt-24"
    >
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{category?.name}</CardTitle>
          {categoryDisabled && !hideUnavailableCategory && (
            <p className="text-sm text-muted-foreground">
              {`${translations("This category is exclusively accessible between")} ${formattedStartTimeWithAmPm} and ${formattedEndTimeWithAmPm}`}
            </p>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-4">
          {category?.items?.length === 0 ||
          (categoryDisabled && hideUnavailableCategory) ? (
            <Empty className="col-span-full min-h-40 rounded-2xl border border-dashed border-border bg-muted/30 p-6">
              <EmptyHeader>
                <EmptyTitle>{translations("No Data Found")}</EmptyTitle>
                <EmptyDescription>
                  This category does not currently have any visible items.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            category?.items?.map((i: MenuItem) => (
              <ItemDisplay
                setSelectedItem={setSelectedItem}
                item={i}
                key={i?.id}
                currency={currency}
                categoryDisabled={categoryDisabled}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
