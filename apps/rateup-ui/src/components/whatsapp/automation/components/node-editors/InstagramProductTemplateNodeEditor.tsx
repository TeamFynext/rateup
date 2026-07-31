// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { useParams } from "@tanstack/react-router";
import { useMemo } from "react";

import { useWaAutomatedReplyById } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";

import { ContainedMultiSelect } from "../editor-ui.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// Instagram Product Template Node Editor
export const InstagramProductTemplateNodeEditor: React.FC<
  NodeComponentProps<"instagramProductTemplateNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;
  const params = useParams({ strict: false });
  const flowbotId = params.flowbotId as string;
  const { data: automation, isPending } = useWaAutomatedReplyById(flowbotId);
  const { data: catalogData, isLoading } = useConnectedWaCatalog(
    typedData.whatsappSettingsPhoneId || automation?.whatsappSettingsPhoneId || "",
  );

  const products = useMemo(
    () =>
      catalogData
        ? (catalogData.products ?? []).map((p) => ({
            value: p.retailer_id ?? "",
            label: p?.productProps?.title || p.retailer_id || "",
          }))
        : [],
    [catalogData],
  );

  const selectedIds = useMemo(
    () => (typedData.elements || []).map((el) => el.id),
    [typedData.elements],
  );

  if (isPending || isLoading) return <RateupLoader />;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Products</p>
      <p className="text-xs text-muted-foreground">
        Select up to 10 products from your catalog. A single product sends a product message;
        multiple products send a carousel.
      </p>

      <ContainedMultiSelect
        label="Products"
        placeholder="Select products"
        data={products}
        value={selectedIds}
        onChange={(values) => {
          const newElements = values.map((id) => ({ id }));
          handleInputChange("elements", newElements);
        }}
        searchable
        maxValues={10}
      />
    </div>
  );
};
