// assets
import { IconCheck, IconGlobe } from "@tabler/icons-react";
// data
import { countries } from "country-data-list";
import React, { forwardRef, useCallback, useEffect, useState } from "react";
import { CircleFlag } from "react-circle-flags";

// shadcn
import {
  Combobox,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox.tsx";
// utils
import { cn } from "@/lib/utils.ts";

// Country interface
export interface Country {
  alpha2: string;
  alpha3: string;
  countryCallingCodes: string[];
  currencies: string[];
  emoji?: string;
  ioc: string;
  languages: string[];
  name: string;
  status: string;
}

// Dropdown props
interface CountryDropdownProps {
  options?: Country[];
  onChange?: (country: Country) => void;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  slim?: boolean;
}

const CountryDropdownComponent = (
  {
    options = countries.all.filter(
      (country: Country) => country.emoji && country.status !== "deleted" && country.ioc !== "PRK",
    ),
    onChange,
    defaultValue,
    disabled = false,
    placeholder = "Select a country",
    slim = false,
    ...props
  }: CountryDropdownProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
) => {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(undefined);

  useEffect(() => {
    if (defaultValue) {
      const initialCountry = options.find(
        (country) => country.alpha3 === defaultValue || country.alpha2 === defaultValue,
      );
      if (initialCountry) {
        setSelectedCountry(initialCountry);
      } else {
        // Reset selected country if defaultValue is not found
        setSelectedCountry(undefined);
      }
    } else {
      // Reset selected country if defaultValue is undefined or null
      setSelectedCountry(undefined);
    }
  }, [defaultValue, options]);

  const namedOptions = options.filter((x) => x.name);
  const items = namedOptions.map((country) => ({ value: country.alpha3, label: country.name }));

  const handleSelect = useCallback(
    (alpha3: string | null) => {
      const country = namedOptions.find((c) => c.alpha3 === alpha3);
      if (!country) return;
      setSelectedCountry(country);
      onChange?.(country);
      setOpen(false);
    },
    [onChange, namedOptions],
  );

  const triggerClasses = cn(
    "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
    slim === true && "w-20",
  );

  return (
    <Combobox
      items={items}
      value={selectedCountry?.alpha3 ?? null}
      onValueChange={handleSelect}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
    >
      <ComboboxTrigger ref={ref} className={triggerClasses} {...props}>
        {selectedCountry ? (
          <div className="flex items-center grow w-0 gap-2 overflow-hidden">
            <div className="inline-flex items-center justify-center w-5 h-5 shrink-0 overflow-hidden rounded-full">
              <CircleFlag countryCode={selectedCountry.alpha2.toLowerCase()} height={20} />
            </div>
            {slim === false && (
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {selectedCountry.name}
              </span>
            )}
          </div>
        ) : (
          <span>{slim === false ? placeholder : <IconGlobe size={20} />}</span>
        )}
      </ComboboxTrigger>
      <ComboboxContent className="p-0">
        <div className="flex flex-col w-full max-h-[250px] sm:max-h-[330px]">
          <ComboboxChipsInput
            placeholder="Search country..."
            className="w-full border-0 border-b rounded-none px-3 h-9 flex-shrink-0"
          />
          <ComboboxEmpty>No country found.</ComboboxEmpty>
          <ComboboxList className="flex-1 overflow-y-auto">
            {(item: { value: string; label: string }) => {
              const country = namedOptions.find((c) => c.alpha3 === item.value);
              return (
                <ComboboxItem
                  key={item.value}
                  value={item.value}
                  className="flex items-center w-full gap-2"
                >
                  <div className="flex grow w-0 space-x-2 overflow-hidden">
                    <div className="inline-flex items-center justify-center w-5 h-5 shrink-0 overflow-hidden rounded-full">
                      <CircleFlag countryCode={country?.alpha2.toLowerCase() ?? ""} height={20} />
                    </div>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                  <IconCheck
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0",
                      item.value === selectedCountry?.alpha3 ? "opacity-100" : "opacity-0",
                    )}
                  />
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </div>
      </ComboboxContent>
    </Combobox>
  );
};

CountryDropdownComponent.displayName = "CountryDropdownComponent";

export const CountryDropdown = forwardRef(CountryDropdownComponent);
