import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  useImportShopifyProducts,
  useShopifyAvailableProducts,
} from "@/backend/whatsapp/catalog/products/products.query";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldTitle } from "@/components/ui/field.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";

interface ImportFromShopifyModalProps {
  catalogId: string;
  opened: boolean;
  onClose: () => void;
}

export function ImportFromShopifyModal({
  catalogId,
  opened,
  onClose,
}: ImportFromShopifyModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: products, isPending, isError } = useShopifyAvailableProducts(catalogId, opened);

  const importMut = useImportShopifyProducts(catalogId);

  // Reset selection when modal opens
  useEffect(() => {
    if (opened) setSelectedIds(new Set());
  }, [opened]);

  const allIds = (products ?? []).map((p) => p.retailer_id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleImport() {
    const selectedItems = (products ?? []).filter((p) => selectedIds.has(p.retailer_id));
    toast.loading(
      `Importing ${selectedItems.length} product${selectedItems.length !== 1 ? "s" : ""}...`,
      {
        id: "import-shopify-products",
      },
    );
    importMut.mutate(selectedItems, {
      onSuccess: (data) => {
        toast.success(
          `Imported ${data.imported} product${data.imported !== 1 ? "s" : ""} from Shopify`,
          {
            id: "import-shopify-products",
          },
        );
        onClose();
      },
      onError: (error) => {
        toast.error(error?.message || "Import failed. Please try again.", {
          id: "import-shopify-products",
        });
      },
    });
  }

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Shopify</DialogTitle>
        </DialogHeader>

        {isPending ? (
          <div className="flex h-48 items-center justify-center">
            <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            Failed to load Shopify products. Make sure Shopify is connected.
          </p>
        ) : products?.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            All Shopify products are already imported.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Select all row */}
            <Field orientation="horizontal" className="justify-between">
              <FieldTitle className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={allSelected}
                  data-state={
                    someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"
                  }
                  onCheckedChange={toggleAll}
                />
                Select all ({allIds.length})
              </FieldTitle>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            </Field>

            {/* Product list */}
            <ScrollArea className="h-[400px] pr-3">
              <div className="flex flex-col gap-2">
                {products.map((p) => (
                  <div
                    key={p.retailer_id}
                    onClick={() => toggleOne(p.retailer_id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2.5 transition-colors ${
                      selectedIds.has(p.retailer_id)
                        ? "border-blue-400 bg-ru-blue-50 dark:bg-blue-950/40"
                        : "border-border hover:border-border hover:bg-muted"
                    }`}
                  >
                    <Checkbox
                      checked={selectedIds.has(p.retailer_id)}
                      onCheckedChange={() => toggleOne(p.retailer_id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {p.image?.[0]?.url && (
                      <img
                        src={p.image[0].url}
                        alt={p.title}
                        className="h-12 w-12 rounded-md object-contain"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sale_price} {p.currencyCode} ·{" "}
                        {p.availability === "in stock" ? "In stock" : "Out of stock"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button disabled={selectedIds.size === 0 || importMut.isPending} onClick={handleImport}>
              {selectedIds.size === 0
                ? "Select products to import"
                : `Import ${selectedIds.size} Product${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
