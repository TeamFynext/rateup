import { IconSelector } from "@tabler/icons-react";
import * as React from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button.tsx";
import {
  Combobox,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { cn } from "@/lib/utils.ts";

const RPNInputDefault = RPNInput.default;

type PhoneInputProps = Omit<React.ComponentProps<"input">, "onChange" | "value" | "ref"> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void;
    ref?: React.Ref<React.ComponentRef<typeof RPNInput.default>>;
  };

export const PhoneInput = ({ className, onChange, value, ref, ...props }: PhoneInputProps) => {
  return (
    <RPNInputDefault
      ref={ref}
      className={cn("flex", className)}
      flagComponent={FlagComponent}
      countrySelectComponent={CountrySelect}
      inputComponent={InputComponent}
      smartCaret={false}
      value={value || undefined}
      /**
       * Handles the onChange event.
       *
       * react-phone-number-input might trigger the onChange event as undefined
       * when a valid phone number is not entered. To prevent this,
       * the value is coerced to an empty string.
       *
       * @param {E164Number | undefined} value - The entered value
       */
      onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
      {...props}
    />
  );
};

const InputComponent = ({
  className,
  ref,
  ...props
}: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> }) => (
  <Input className={cn("rounded-e-lg rounded-s-none", className)} {...props} ref={ref} />
);
InputComponent.displayName = "InputComponent";

interface CountryEntry {
  label: string;
  value: RPNInput.Country | undefined;
}

interface CountrySelectProps {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
}

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const items = countryList
    .filter((entry): entry is CountryEntry & { value: RPNInput.Country } => Boolean(entry.value))
    .map((entry) => ({ value: entry.value, label: entry.label }));

  return (
    <Combobox
      items={items}
      value={selectedCountry ?? null}
      onValueChange={(country: RPNInput.Country | null) => {
        if (country) onChange(country);
        setIsOpen(false);
      }}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={disabled}
    >
      <ComboboxTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="flex gap-1 rounded-e-none rounded-s-lg border-r-0 px-3 focus:z-10"
          />
        }
      >
        <FlagComponent country={selectedCountry} countryName={selectedCountry} />
        <IconSelector
          className={cn("-mr-2 size-4 opacity-50", disabled ? "hidden" : "opacity-100")}
        />
      </ComboboxTrigger>
      <ComboboxContent className="w-75 p-0">
        <ComboboxChipsInput
          placeholder="Search country..."
          className="w-full border-0 border-b rounded-none px-3 h-9"
        />
        <ComboboxEmpty>No country found.</ComboboxEmpty>
        <ScrollArea className="h-72">
          <ComboboxList>
            {(item: { value: RPNInput.Country; label: string }) => (
              <CountrySelectOption key={item.value} country={item.value} countryName={item.label} />
            )}
          </ComboboxList>
        </ScrollArea>
      </ComboboxContent>
    </Combobox>
  );
};

const CountrySelectOption = ({ country, countryName }: RPNInput.FlagProps) => {
  return (
    <ComboboxItem value={country} className="gap-2">
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-sm text-foreground/50">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
    </ComboboxItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};
