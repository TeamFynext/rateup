import { isValidPhoneNumber } from "libphonenumber-js";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useContactLookupByPhone } from "@/api/loyalty/loyalty.query";
import { LOYALTY_GENDERS, type LoyaltyGender } from "@/api/loyalty/loyalty.type";

import { dobToDisplay, formatDobInput, parseDob } from "./logic/dob";
import { PhoneField } from "./PhoneField";
import {
  CashierButton,
  CashierInput,
  Field,
  FONT,
  FormHeader,
  InlineError,
  StepScroll,
  useTheme,
} from "./ui";
import { useDebounced } from "./useDebounced";

export interface NewCustomerValues {
  name: string;
  /** Digits only, dial code included. */
  phone: string;
  /** `YYYY-MM-DD`, or undefined. */
  dob?: string;
  gender?: LoyaltyGender;
  referCode?: string;
}

/** What the form opens with — from the search box, a "not found" lookup, or a picked contact. */
export interface NewCustomerPrefill {
  phone?: string;
  name?: string;
  dob?: string | null;
  gender?: LoyaltyGender | null;
}

interface NewCustomerFormProps {
  prefill: NewCustomerPrefill;
  defaultCountry: string;
  signupBonus: number;
  pointsName: string;
  isSaving: boolean;
  programActive: boolean;
  error: string | null;
  onSubmit: (values: NewCustomerValues) => void;
  /** The number already belongs to a member — open them instead of registering twice. */
  onOpenExisting: (phone: string) => void;
}

const GENDER_LABELS: Record<LoyaltyGender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

/** Register on the spot: one screen, the join bonus is automatic, the welcome goes out. */
export function NewCustomerForm({
  prefill,
  defaultCountry,
  signupBonus,
  pointsName,
  isSaving,
  programActive,
  error,
  onSubmit,
  onOpenExisting,
}: Readonly<NewCustomerFormProps>) {
  const { t } = useTheme();
  const [name, setName] = useState(prefill.name ?? "");
  const [phone, setPhone] = useState((prefill.phone ?? "").replace(/\D/g, ""));
  const [dob, setDob] = useState(dobToDisplay(prefill.dob));
  const [gender, setGender] = useState<LoyaltyGender | undefined>(prefill.gender ?? undefined);
  const [referCode, setReferCode] = useState("");
  const [touched, setTouched] = useState(false);

  const debouncedPhone = useDebounced(phone, 400);
  // `isValidPhoneNumber` wants an E.164 string; the field hands out bare digits.
  const phoneValid = debouncedPhone.length > 0 && isValidPhoneNumber(`+${debouncedPhone}`);
  const { data: lookup } = useContactLookupByPhone(debouncedPhone, phoneValid);
  const alreadyMember = Boolean(lookup?.alreadyMember);

  // The org may already know these from a WhatsApp conversation or an import — save the
  // typing, but only into fields the cashier has not filled in themselves.
  //
  // This one stays an effect, and the rule is silenced rather than satisfied. These are
  // editable fields, so they cannot be derived from `lookup`: the cashier must be able to
  // clear or overwrite a prefilled name, and a derived value would reinstate itself on the
  // next render. The functional updaters are what keep it safe — each writes only into a
  // field that is still empty, so a late-arriving lookup can never overwrite typing that is
  // already in progress, and the effect is idempotent once the fields are filled.
  useEffect(() => {
    const contact = lookup?.contact;
    if (!contact) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (contact.name) setName((current) => current || contact.name || "");
    if (contact.dob) setDob((current) => current || dobToDisplay(contact.dob));
    if (contact.gender) setGender((current) => current ?? contact.gender ?? undefined);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lookup]);

  const nameValid = name.trim().length > 0;
  const submittablePhone = phone.length > 0 && isValidPhoneNumber(`+${phone}`);
  // A partial birthday is a mistake, not an omission — an empty field is fine, half of one
  // is not, and silently dropping it would lose a birthday the customer just gave.
  const dobDigits = dob.replace(/\D/g, "").length;
  const dobValue = dobDigits === 0 ? undefined : (parseDob(dob) ?? null);
  const dobValid = dobValue !== null;

  const submit = () => {
    setTouched(true);
    if (!nameValid || !submittablePhone || !dobValid || !programActive) return;
    onSubmit({
      name: name.trim(),
      phone,
      dob: dobValue,
      gender,
      referCode: referCode.trim() || undefined,
    });
  };

  return (
    <StepScroll
      footer={
        alreadyMember ? (
          <CashierButton
            label={`Open ${lookup?.contact?.name || "this customer"}`}
            onPress={() => onOpenExisting(phone)}
          />
        ) : (
          <CashierButton
            label={
              isSaving
                ? "Registering…"
                : signupBonus > 0
                  ? `Register and give ${signupBonus} ${pointsName}`
                  : "Register"
            }
            disabled={isSaving || !programActive}
            loading={isSaving}
            onPress={submit}
          />
        )
      }
    >
      <FormHeader title="New customer" />

      <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3, lineHeight: 19 }}>
        {signupBonus > 0
          ? `They get ${signupBonus} ${pointsName} for joining and a WhatsApp welcome.`
          : "They get a WhatsApp welcome the moment they join."}
      </Text>

      <InlineError message={error} />

      <Field
        label="Phone number"
        hint={alreadyMember ? undefined : "The number the welcome goes to."}
        error={
          alreadyMember
            ? "This number is already a member."
            : touched && !submittablePhone
              ? "That does not look like a phone number"
              : null
        }
      >
        <PhoneField
          value={phone}
          onChange={setPhone}
          defaultCountry={defaultCountry}
          invalid={touched && !submittablePhone}
          autoFocus={!prefill.phone}
        />
      </Field>

      <Field label="Name" error={touched && !nameValid ? "Their name" : null}>
        <CashierInput
          value={name}
          onChangeText={setName}
          placeholder="Priya"
          autoCapitalize="words"
          invalid={touched && !nameValid}
          autoFocus={Boolean(prefill.phone)}
        />
      </Field>

      <Field
        label="Date of birth (optional)"
        hint="Used for the birthday message."
        error={touched && !dobValid ? "That is not a date — DD/MM/YYYY" : null}
      >
        <CashierInput
          value={dob}
          onChangeText={(next) => setDob(formatDobInput(next))}
          placeholder="DD/MM/YYYY"
          keyboardType="number-pad"
          maxLength={10}
          invalid={touched && !dobValid}
        />
      </Field>

      <Field label="Gender (optional)">
        <View style={{ flexDirection: "row", gap: 8 }}>
          {LOYALTY_GENDERS.map((value) => {
            const picked = gender === value;
            return (
              <Pressable
                key={value}
                // Tapping the chosen one again clears it — there is no "prefer not to say"
                // option to select, because not answering *is* that answer.
                onPress={() => setGender(picked ? undefined : value)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 11,
                  borderWidth: picked ? 2 : 1,
                  borderColor: picked ? t.brand : t.border1,
                  backgroundColor: picked ? t.brandSoft : t.surface,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT.semibold,
                    fontSize: 13,
                    color: picked ? t.brand : t.fg2,
                  }}
                >
                  {GENDER_LABELS[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field
        label="Referral code (optional)"
        hint="The friend who referred them gets their bonus when this account is created."
      >
        <CashierInput
          value={referCode}
          onChangeText={(next) => setReferCode(next.toUpperCase())}
          placeholder="Enter a code if they have one"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={32}
        />
      </Field>

      {!programActive ? (
        <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.status.new.fg }}>
          The program is not live, so nobody can join yet. Activate or resume it on the web
          dashboard.
        </Text>
      ) : null}
    </StepScroll>
  );
}
