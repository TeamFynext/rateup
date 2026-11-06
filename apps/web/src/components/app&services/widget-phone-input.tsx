import { IconSelector } from "@tabler/icons-react";
import * as React from "react";
import * as RPNInput from "react-phone-number-input";

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

/**
 * `ui/phone-input.tsx` for the support widget, minus its static import of every flag (~50 KB
 * gzipped). India — the widget's default — is drawn inline; the full set is fetched only when
 * another country is picked or typed. Loaded lazily by the widget's contact card.
 */

/* Re-exported so the widget validates against this module's metadata, not a second copy. */
export { isValidPhoneNumber } from "react-phone-number-input";

type FlagSet = typeof import("react-phone-number-input/flags").default;

let flagSet: FlagSet | null = null;
let flagSetPromise: Promise<FlagSet> | null = null;

function loadFlagSet() {
  flagSetPromise ??= import("react-phone-number-input/flags").then((module) => {
    flagSet = module.default;
    return flagSet;
  });
  return flagSetPromise;
}

function useFlagSet(needed: boolean) {
  const [flags, setFlags] = React.useState(flagSet);
  React.useEffect(() => {
    if (!needed || flags) return;
    let live = true;
    loadFlagSet()
      .then((loaded) => {
        if (live) setFlags(loaded);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [needed, flags]);
  return flags;
}

/* `country-flag-icons/react/3x2/IN`, inlined — that package is only a transitive dependency. */
function IndiaFlag({ title }: Readonly<{ title?: string }>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342">
      {title && <title>{title}</title>}
      <path fill="#ff6820" d="M0 0h513v114H0V0z" />
      <path fill="#FFF" d="M0 114h513v114H0V114z" />
      <path fill="#046a38" d="M0 228h513v114H0V228z" />
      <path
        fill="none"
        stroke="#07038d"
        strokeWidth="4"
        d="M256.5 136.8c18.9 0 34.2 15.3 34.2 34.2s-15.3 34.2-34.2 34.2-34.2-15.3-34.2-34.2 15.3-34.2 34.2-34.2z"
      />
      <g stroke="#07038d" strokeWidth="2">
        <path d="m265.3 138.2-17.6 65.7m17.6-65.7-17.6 65.7M273.5 141.6l-34 58.9M280.5 147l-48 48M285.9 154 227 188M289.3 162.2l-65.7 17.6M290.5 171h-68M289.3 179.8l-65.7-17.6M285.9 188 227 154M280.5 195l-48-48M273.5 200.4l-34-58.9M265.3 203.8l-17.6-65.7M256.5 205v-68M247.7 203.8l17.6-65.7M239.5 200.4l34-58.9M232.5 195l48.1-48.1M227.1 188l58.9-34M223.7 179.8l65.7-17.6M222.5 171h68M223.7 162.2l65.7 17.6M227.1 154l58.9 34M232.5 147l48.1 48.1M239.5 141.6l34 58.9M247.7 138.2l17.6 65.7" />
      </g>
    </svg>
  );
}

const RPNInputDefault = RPNInput.default;

type PhoneInputProps = Omit<React.ComponentProps<"input">, "onChange" | "value" | "ref"> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void;
  };

export default function WidgetPhoneInput({
  className,
  onChange,
  value,
  ...props
}: Readonly<PhoneInputProps>) {
  return (
    <RPNInputDefault
      className={cn("flex", className)}
      flagComponent={FlagComponent}
      countrySelectComponent={CountrySelect}
      inputComponent={InputComponent}
      smartCaret={false}
      value={value || undefined}
      /* The library reports an incomplete number as `undefined`; the form wants a string. */
      onChange={(next) => onChange?.(next || ("" as RPNInput.Value))}
      {...props}
    />
  );
}

const InputComponent = ({
  className,
  ref,
  ...props
}: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> }) => (
  <Input className={cn("rounded-e-lg rounded-s-none", className)} {...props} ref={ref} />
);

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
  const isIndia = country === "IN";
  const flags = useFlagSet(Boolean(country) && !isIndia);
  const Flag = isIndia ? IndiaFlag : flags?.[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};
