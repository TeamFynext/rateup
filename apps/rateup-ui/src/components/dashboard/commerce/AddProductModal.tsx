import { useState } from "react";
import { toast } from "sonner";

import { useCreateBatchCatalogProducts } from "@/backend/whatsapp/catalog/products/products.query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Apparel", "Electronics", "Footwear", "Accessories"];

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || `product-${Date.now()}`
  );
}

export function AddProductModal({
  open,
  onClose,
  catalogId,
  currencySymbol = "₹",
}: Readonly<{ open: boolean; onClose: () => void; catalogId: string; currencySymbol?: string }>) {
  const create = useCreateBatchCatalogProducts(catalogId);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("Apparel");

  const reset = () => {
    setName("");
    setPrice("");
    setStock("");
    setCategory("Apparel");
  };

  const save = () => {
    if (!name.trim() || !catalogId) return;
    const priceNum = Number(price) || 0;
    const stockNum = Number(stock) || 0;
    const payload = {
      type: "PRODUCT_ITEM",
      PRODUCT_ITEM: [
        {
          retailer_id: slugify(name),
          title: name.trim(),
          description: name.trim(),
          condition: "new",
          availability: stockNum > 0 ? "in stock" : "out of stock",
          brand: category,
          price: priceNum,
          sale_price: priceNum,
          currencyCode: "INR",
          link: "",
          internal_label: [],
          image: [{ url: "", tag: [] }],
          video: [{ url: "", tag: [] }],
        },
      ],
    };
    toast.loading("Adding product…", { id: "cx-add-product" });
    create.mutate(payload, {
      onSuccess: () => {
        toast.success("Product added", { id: "cx-add-product" });
        reset();
        onClose();
      },
      onError: (e: any) =>
        toast.error(e?.message || "Failed to add product", { id: "cx-add-product" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="cx-name">Product name</FieldLabel>
            <Input
              id="cx-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Classic Cotton Tee"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="cx-price">Price ({currencySymbol})</FieldLabel>
              <Input
                id="cx-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="799"
                inputMode="numeric"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cx-stock">Stock</FieldLabel>
              <Input
                id="cx-stock"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="100"
                inputMode="numeric"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel>Category</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const sel = c === category;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                      sel
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim() || !catalogId || create.isPending}>
            Add Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
