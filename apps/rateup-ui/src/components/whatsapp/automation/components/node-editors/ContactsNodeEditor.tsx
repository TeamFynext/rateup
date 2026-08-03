// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";

import { Button } from "@/components/ui/button.tsx";

import { ContainedDatePickerInput, ContainedTextField, Select } from "../editor-ui.tsx";
import { FieldMsg, styles } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// ContactsNode Component
export const ContactsNodeEditor: React.FC<NodeComponentProps<"contactsNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const [activeContactIndex, setActiveContactIndex] = useState(0);

  const addNewContact = () => {
    if (!typedData.contacts || typedData.contacts.length >= 257) return;

    const newContacts = [...(typedData.contacts || []), {}];
    handleInputChange("contacts", newContacts);
    setActiveContactIndex(newContacts.length - 1);
  };

  const removeContact = (index: number) => {
    const newContacts = [...(typedData.contacts || [])];
    newContacts.splice(index, 1);

    if (newContacts.length === 0) {
      newContacts.push({});
    }

    handleInputChange("contacts", newContacts);
    setActiveContactIndex(Math.min(index, newContacts.length - 1));
  };

  const updateContactField = (index: number, path: string[], value: unknown) => {
    const newContacts = [...(typedData.contacts || [])];

    // If newContacts[index] is undefined, initialize it as an empty object
    if (!newContacts[index]) {
      newContacts[index] = {};
    }

    // Navigate to the nested property and update it. The path is dynamic, so
    // the walk goes through an open view of the contact object.
    let current = newContacts[index] as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        // Initialize as object or array based on next path segment
        current[path[i]] = isNaN(Number(path[i + 1])) ? {} : [];
      }
      current = current[path[i]] as Record<string, unknown>;
    }
    current[path[path.length - 1]] = value;

    handleInputChange("contacts", newContacts);
  };

  const activeContact = typedData.contacts?.[activeContactIndex] || {};

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="mt-2 font-medium">Contacts ({typedData.contacts?.length || 0}/257)</p>
        <Button size="xs" disabled={typedData.contacts?.length >= 257} onClick={addNewContact}>
          <IconPlus size={16} /> Add Contact
        </Button>
      </div>
      <FieldMsg name="contacts" />

      {typedData.contacts && typedData.contacts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            label="Select Contact to Edit"
            data={typedData.contacts.map((_, i) => ({
              value: i.toString(),
              label: `Contact ${i + 1}${activeContact?.name?.formatted_name ? `: ${activeContact.name.formatted_name}` : ""}`,
            }))}
            value={activeContactIndex.toString()}
            onChange={(value) => setActiveContactIndex(parseInt(value || "0"))}
            style={{ flex: 1 }}
          />
          {typedData.contacts.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-6 text-destructive"
              onClick={() => removeContact(activeContactIndex)}
            >
              <IconTrash size={16} />
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Create contact cards to share with your users</p>

      {/* Name section - formatted_name is required */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <p className="text-sm font-medium">Contact Name</p>
        <ContainedTextField
          label="Full Name"
          required
          placeholder="Enter full name"
          value={activeContact?.name?.formatted_name || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "formatted_name"], e.target.value);
          }}
          description="Required - Full name as it should appear"
        />

        <ContainedTextField
          label="First Name"
          placeholder="First name"
          required
          value={activeContact?.name?.first_name || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "first_name"], e.target.value);
          }}
        />
        <ContainedTextField
          label="Last Name"
          placeholder="Last name"
          value={activeContact?.name?.last_name || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "last_name"], e.target.value);
          }}
        />

        <ContainedTextField
          label="Middle Name"
          placeholder="Middle name"
          value={activeContact?.name?.middle_name || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "middle_name"], e.target.value);
          }}
        />
        <ContainedTextField
          label="Prefix"
          placeholder="e.g., Dr., Mr."
          value={activeContact?.name?.prefix || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "prefix"], e.target.value);
          }}
        />
        <ContainedTextField
          label="Suffix"
          placeholder="e.g., Jr., Ph.D."
          value={activeContact?.name?.suffix || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "suffix"], e.target.value);
          }}
        />
      </div>

      {/* Organization section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <p className="text-sm font-medium">Organization</p>
        <ContainedTextField
          label="Company"
          placeholder="Company or organization name"
          value={activeContact?.org?.company || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["org", "company"], e.target.value);
          }}
        />

        <ContainedTextField
          label="Department"
          placeholder="Department name"
          value={activeContact?.org?.department || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["org", "department"], e.target.value);
          }}
        />
        <ContainedTextField
          label="Job Title"
          placeholder="Job title"
          value={activeContact?.org?.title || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["org", "title"], e.target.value);
          }}
        />
      </div>

      {/* Birthday */}
      <ContainedDatePickerInput
        label="Birthday"
        placeholder="YYYY-MM-DD"
        value={activeContact?.birthday ? new Date(activeContact.birthday) : undefined}
        onChange={(e) =>
          updateContactField(activeContactIndex, ["birthday"], dayjs(e).format("YYYY-MM-DD"))
        }
      />

      {/* Phones section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-sm font-medium">Phone Numbers</p>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const phones = [...(activeContact?.phones || []), { phone: "", type: "CELL" }];
              updateContactField(activeContactIndex, ["phones"], phones);
            }}
          >
            + Add Phone
          </Button>
        </div>

        {(activeContact?.phones || []).map((phone, index) => (
          <div key={index} className="flex flex-col gap-4">
            <ContainedTextField
              label={`Phone ${index + 1}`}
              placeholder="Phone number with country code"
              style={{ flex: 2 }}
              value={phone.phone || ""}
              onChange={(e) => {
                const phones = [...(activeContact?.phones || [])];
                phones[index] = {
                  ...phones[index],
                  phone: e.target.value,
                };
                updateContactField(activeContactIndex, ["phones"], phones);
              }}
            />
            <Select
              label="Type"
              data={[
                { value: "CELL", label: "Cell" },
                { value: "WORK", label: "Work" },
                { value: "HOME", label: "Home" },
                { value: "MAIN", label: "Main" },
              ]}
              value={phone.type || "CELL"}
              onChange={(value) => {
                const typedValue = value as "HOME" | "WORK" | "CELL" | "MAIN";
                const phones = [...(activeContact?.phones || [])];
                phones[index] = { ...phones[index], type: typedValue };
                updateContactField(activeContactIndex, ["phones"], phones);
              }}
              style={{ flex: 1 }}
            />
            <ContainedTextField
              label="WhatsApp ID"
              placeholder="WhatsApp ID (wa_id)"
              value={phone.wa_id || ""}
              onChange={(e) => {
                const phones = [...(activeContact?.phones || [])];
                phones[index] = {
                  ...phones[index],
                  wa_id: e.target.value,
                };
                updateContactField(activeContactIndex, ["phones"], phones);
              }}
              description="WhatsApp user ID. If omitted, the message will display an Invite to WhatsApp button instead of the standard button"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => {
                const phones = [...(activeContact?.phones || [])];
                phones.splice(index, 1);
                updateContactField(activeContactIndex, ["phones"], phones);
              }}
            >
              <IconX size={16} />
            </Button>
          </div>
        ))}
      </div>

      {/* Emails section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-sm font-medium">Email Addresses</p>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const emails = [...(activeContact?.emails || []), { email: "", type: "WORK" }];
              updateContactField(activeContactIndex, ["emails"], emails);
            }}
          >
            + Add Email
          </Button>
        </div>

        {(activeContact?.emails || []).map((email, index) => (
          <div key={index} className="flex flex-col gap-4">
            <ContainedTextField
              label={`Email ${index + 1}`}
              placeholder="Email address"
              style={{ flex: 2 }}
              value={email.email || ""}
              onChange={(e) => {
                const emails = [...(activeContact?.emails || [])];
                emails[index] = {
                  ...emails[index],
                  email: e.target.value,
                };
                updateContactField(activeContactIndex, ["emails"], emails);
              }}
            />
            <Select
              label="Type"
              data={[
                { value: "WORK", label: "Work" },
                { value: "HOME", label: "Home" },
                { value: "OTHER", label: "Other" },
              ]}
              value={email.type || "WORK"}
              onChange={(value) => {
                const typedValue = value as "WORK" | "HOME" | "OTHER";
                const emails = [...(activeContact?.emails || [])];
                emails[index] = { ...emails[index], type: typedValue };
                updateContactField(activeContactIndex, ["emails"], emails);
              }}
              style={{ flex: 1 }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => {
                const emails = [...(activeContact?.emails || [])];
                emails.splice(index, 1);
                updateContactField(activeContactIndex, ["emails"], emails);
              }}
            >
              <IconX size={16} />
            </Button>
          </div>
        ))}
      </div>

      {/* Addresses section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-sm font-medium">Addresses</p>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const addresses = [
                ...(activeContact?.addresses || []),
                {
                  street: "",
                  city: "",
                  state: "",
                  zip: "",
                  country: "",
                  country_code: "",
                  type: "HOME",
                },
              ];
              updateContactField(activeContactIndex, ["addresses"], addresses);
            }}
          >
            + Add Address
          </Button>
        </div>

        {(activeContact?.addresses || []).map((address, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <p className="text-sm">Address {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                onClick={() => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses.splice(index, 1);
                  updateContactField(activeContactIndex, ["addresses"], addresses);
                }}
              >
                <IconX size={16} />
              </Button>
            </div>

            <ContainedTextField
              label="Street"
              placeholder="Street number and name"
              value={address.street || ""}
              onChange={(e) => {
                const addresses = [...(activeContact?.addresses || [])];
                addresses[index] = {
                  ...addresses[index],
                  street: e.target.value,
                };
                updateContactField(activeContactIndex, ["addresses"], addresses);
              }}
            />

            <div className="flex flex-wrap items-center gap-2.5 *:flex-1">
              <ContainedTextField
                label="City"
                placeholder="City"
                value={address.city || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    city: e.target.value,
                  };
                  updateContactField(activeContactIndex, ["addresses"], addresses);
                }}
              />
              <ContainedTextField
                label="State"
                placeholder="State/Province"
                value={address.state || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    state: e.target.value,
                  };
                  updateContactField(activeContactIndex, ["addresses"], addresses);
                }}
              />
            </div>

            <div className="flex flex-col gap-4">
              <ContainedTextField
                label="ZIP/Postal Code"
                placeholder="ZIP/Postal code"
                value={address.zip || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    zip: e.target.value,
                  };
                  updateContactField(activeContactIndex, ["addresses"], addresses);
                }}
              />
              <ContainedTextField
                label="Country"
                placeholder="Country name"
                value={address.country || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    country: e.target.value,
                  };
                  updateContactField(activeContactIndex, ["addresses"], addresses);
                }}
              />
              <ContainedTextField
                label="Country Code"
                placeholder="ISO code (e.g., US)"
                maxLength={2}
                value={address.country_code || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    country_code: e.target.value.toUpperCase(),
                  };
                  updateContactField(activeContactIndex, ["addresses"], addresses);
                }}
                description="ISO two-letter code"
              />
            </div>

            <Select
              label="Address Type"
              data={[
                { value: "HOME", label: "Home" },
                { value: "WORK", label: "Work" },
                { value: "OTHER", label: "Other" },
              ]}
              value={address.type || "HOME"}
              onChange={(value) => {
                const typedValue = value as "WORK" | "HOME" | "OTHER";
                const addresses = [...(activeContact?.addresses || [])];
                addresses[index] = { ...addresses[index], type: typedValue };
                updateContactField(activeContactIndex, ["addresses"], addresses);
              }}
              style={{ maxWidth: 200 }}
            />
          </div>
        ))}
      </div>

      {/* URLs section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-sm font-medium">Websites</p>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const urls = [...(activeContact?.urls || []), { url: "", type: "WORK" }];
              updateContactField(activeContactIndex, ["urls"], urls);
            }}
          >
            + Add Website
          </Button>
        </div>

        {(activeContact?.urls || []).map((url, index) => (
          <div key={index} className="flex flex-col gap-4">
            <ContainedTextField
              label={`Website ${index + 1}`}
              placeholder="https://..."
              style={{ flex: 2 }}
              value={url.url || ""}
              onChange={(e) => {
                const urls = [...(activeContact?.urls || [])];
                urls[index] = { ...urls[index], url: e.target.value };
                updateContactField(activeContactIndex, ["urls"], urls);
              }}
            />
            <Select
              label="Type"
              data={[
                { value: "WORK", label: "Work" },
                { value: "HOME", label: "Home" },
                { value: "PROFILE", label: "Profile" },
                { value: "OTHER", label: "Other" },
              ]}
              value={url.type || "WORK"}
              onChange={(value) => {
                const typedValue = value as "WORK" | "HOME" | "OTHER" | "PROFILE";
                const urls = [...(activeContact?.urls || [])];
                urls[index] = { ...urls[index], type: typedValue };
                updateContactField(activeContactIndex, ["urls"], urls);
              }}
              style={{ flex: 1 }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => {
                const urls = [...(activeContact?.urls || [])];
                urls.splice(index, 1);
                updateContactField(activeContactIndex, ["urls"], urls);
              }}
            >
              <IconX size={16} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
