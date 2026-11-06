import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import type { CustomFieldType } from "@/backend/campaign/contacts/contacts.api";

export interface CustomField {
  id: string;
  slug: string;
  name: string;
  type: CustomFieldType;
  description: string | null;
  createdAt: string;
  orgId: string;
  visibility: boolean;
  listValues?: string[];
  values: string;
  /**
   * Written by `updateCustomField`/`resetCustomFields`; the readers go through
   * `values`. Declared so the update paths type-check against what they
   * actually store.
   */
  value?: unknown;
}

interface CustomFieldsContextType {
  customFields: CustomField[];
  setCustomFields: (fields: CustomField[]) => void;
  updateCustomField: (id: string, value: unknown) => void;
  getCustomFieldValue: (id: string) => string | undefined;
  resetCustomFields: () => void;
}

const CustomFieldsContext = createContext<CustomFieldsContextType | undefined>(undefined);

interface CustomFieldsProviderProps {
  children: ReactNode;
  initialFields?: CustomField[];
}

export function CustomFieldsProvider({ children, initialFields = [] }: CustomFieldsProviderProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>(initialFields);

  const updateCustomField = (id: string, value: unknown) => {
    setCustomFields((prev) => prev.map((field) => (field.id === id ? { ...field, value } : field)));
  };

  const getCustomFieldValue = (id: string) => {
    const field = customFields.find((f) => f.id === id);
    return field?.values;
  };

  const resetCustomFields = () => {
    setCustomFields((prev) => prev.map((field): CustomField => ({ ...field, value: undefined })));
  };

  useEffect(() => {
    setCustomFields(initialFields || []);
  }, [initialFields]);

  return (
    <CustomFieldsContext.Provider
      value={{
        customFields,
        setCustomFields,
        updateCustomField,
        getCustomFieldValue,
        resetCustomFields,
      }}
    >
      {children}
    </CustomFieldsContext.Provider>
  );
}

export function useCustomFieldsContext() {
  const context = useContext(CustomFieldsContext);
  if (context === undefined) {
    throw new Error("useCustomFieldsContext must be used within a CustomFieldsProvider");
  }
  return context;
}
