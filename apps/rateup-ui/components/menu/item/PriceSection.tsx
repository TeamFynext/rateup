"use client";

import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { MenuItemPriceType } from "../../../types/enums";
import { Button } from "../../ui/button";
import { Field, FieldContent, FieldLabel, FieldSet } from "../../ui/field";
import { Input } from "../../ui/input";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { currencyLabel } from "../util/currencyData";

type Variant = {
  name?: string;
  price?: string | number;
};

type PriceSectionFormAdapter = {
  values?: {
    price?: {
      type?: MenuItemPriceType;
      price?: string | number;
      variants?: Variant[];
    };
  };
  getInputProps: (path: string) => {
    value?: any;
    onChange?: (event: any) => void;
    checked?: boolean;
  };
  insertListItem: (path: string, value: any) => void;
  setFieldValue: (path: string, value: any) => void;
};

export function PriceSection({
  form,
  currency = "0",
}: {
  readonly form: PriceSectionFormAdapter;
  readonly currency: string;
}) {
  const translations = useExtracted();
  const isFixed = form?.values?.price?.type === MenuItemPriceType.FIXED;
  const variants = form?.values?.price?.variants ?? [];

  return (
    <FieldSet>
      <Field>
        <FieldLabel>{translations("Price")}</FieldLabel>
        <FieldContent>
          <RadioGroup
            value={form.getInputProps("price.type").value}
            onValueChange={(value) => form.setFieldValue("price.type", value)}
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem
                value={MenuItemPriceType.FIXED}
                id="price-fixed"
              />
              {translations("Fixed")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem
                value={MenuItemPriceType.VARIANT}
                id="price-variant"
              />
              {translations("Variant")}
            </label>
          </RadioGroup>
        </FieldContent>
      </Field>

      {isFixed ? (
        <Field>
          <FieldLabel>{translations("Price")}</FieldLabel>
          <FieldContent>
            <Input
              placeholder="399"
              value={form.getInputProps("price.price").value ?? ""}
              onChange={(event) =>
                form.setFieldValue("price.price", event.target.value)
              }
            />
            <p className="text-xs text-muted-foreground">
              {translations("Currency")}:{" "}
              {currencyLabel[Number(currency)]?.symbol}
            </p>
          </FieldContent>
        </Field>
      ) : (
        <Field>
          <FieldLabel>{translations("Variants")}</FieldLabel>
          <FieldContent>
            <div className="flex flex-wrap gap-3">
              {variants.map((_variant, index) => (
                <div
                  key={`${_variant?.name ?? "variant"}-${_variant?.price ?? ""}`}
                  className="w-28 rounded-xl border p-2"
                >
                  <Input
                    placeholder="Small"
                    className="mb-2"
                    value={
                      form.getInputProps(`price.variants.${index}.name`)
                        .value ?? ""
                    }
                    onChange={(event) =>
                      form.setFieldValue(
                        `price.variants.${index}.name`,
                        event.target.value,
                      )
                    }
                  />
                  <Input
                    placeholder="399"
                    value={
                      form.getInputProps(`price.variants.${index}.price`)
                        .value ?? ""
                    }
                    onChange={(event) =>
                      form.setFieldValue(
                        `price.variants.${index}.price`,
                        event.target.value,
                      )
                    }
                  />
                </div>
              ))}

              <div className="flex flex-col gap-2">
                {variants.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      form.insertListItem("price.variants", {
                        name: "",
                        price: "",
                      })
                    }
                  >
                    <IconPlus />
                  </Button>
                )}
                {variants.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newVariants = variants.slice(0, -1);
                      form.setFieldValue("price.variants", newVariants);
                    }}
                  >
                    <IconMinus />
                  </Button>
                )}
              </div>
            </div>
          </FieldContent>
        </Field>
      )}
    </FieldSet>
  );
}
