import {
  Group,
  Radio,
  TextInput,
  SimpleGrid,
  ActionIcon,
  Text,
  Box,
} from "@mantine/core";
import { IconPlus, IconMinus } from "@tabler/icons-react";
import React from "react";
import { MenuItemPriceType } from "../../../types/enums";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import { currencyLabel } from "../util/currencyData";

export function PriceSection({
  form,
  currency = "0",
}: {
  readonly form: any;
  readonly currency: string;
}) {
  return (
    <>
      <Group>
        <Text>Price</Text>
        <Radio.Group {...form.getInputProps("price.type")}>
          <Group>
            <Radio label="Fixed" value={MenuItemPriceType.FIXED} />
            <Radio label="Variant" value={MenuItemPriceType.VARIANT} />
          </Group>
        </Radio.Group>
      </Group>
      {form?.values?.price?.type === MenuItemPriceType.FIXED ? (
        <ContainedTextField
          leftSection={currencyLabel[Number(currency)]?.symbol}
          placeholder="399"
          {...form.getInputProps("price.price")}
        />
      ) : (
        <Group gap={"3px"}>
          {form?.values?.price?.variants?.map(
            (_variant: string, index: number) => {
              return (
                <Box
                  w="95px"
                  p={"5px"}
                  key={_variant + index}
                  style={{
                    border: "1px solid gray",
                    borderRadius: "15px",
                  }}
                >
                  {form?.values?.price?.variant}
                  <TextInput
                    placeholder="Small"
                    variant="unstyled"
                    sx={{
                      borderBottom: "1px solid gray",
                    }}
                    {...form.getInputProps(`price.variants.${index}.name`)}
                  />
                  <TextInput
                    leftSection={
                      <Box style={{ fontSize: "small" }}>
                        {currencyLabel[Number(currency)]?.symbol}
                      </Box>
                    }
                    placeholder="399"
                    radius={"100px"}
                    {...form.getInputProps(`price.variants.${index}.price`)}
                  />
                </Box>
              );
            },
          )}
          <SimpleGrid>
            {form?.values?.price?.variants?.length < 3 && (
              <ActionIcon
                variant="filled"
                size={"lg"}
                onClick={() => form.insertListItem("price.variants", {})}
              >
                <IconPlus size={16} />
              </ActionIcon>
            )}
            {form?.values?.price?.variants?.length > 1 && (
              <ActionIcon
                variant="filled"
                size={"lg"}
                onClick={() => {
                  const newVariants = form?.values?.price?.variants?.slice(
                    0,
                    -1,
                  );
                  form.setFieldValue("price.variants", newVariants);
                }}
              >
                <IconMinus size={16} />
              </ActionIcon>
            )}
          </SimpleGrid>
        </Group>
      )}
    </>
  );
}
