"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

interface CustomField {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  createdAt: string;
  orgId: string;
  visibility: boolean;
  listValues?: string[];
  values: string;
}

interface CustomFieldsContextType {
  customFields: CustomField[];
  setCustomFields: (fields: CustomField[]) => void;
  updateCustomField: (id: string, value: any) => void;
  getCustomFieldValue: (id: string) => any;
  resetCustomFields: () => void;
}

const CustomFieldsContext = createContext<CustomFieldsContextType | undefined>(
  undefined,
);

interface CustomFieldsProviderProps {
  children: ReactNode;
  initialFields?: CustomField[];
}

export function CustomFieldsProvider({
  children,
  initialFields = [],
}: CustomFieldsProviderProps) {
  const [customFields, setCustomFields] =
    useState<CustomField[]>(initialFields);

  const updateCustomField = (id: string, value: any) => {
    setCustomFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, value } : field)),
    );
  };

  const getCustomFieldValue = (id: string) => {
    const field = customFields.find((f) => f.id === id);
    return field?.values;
  };

  const resetCustomFields = () => {
    setCustomFields((prev) =>
      prev.map((field) => ({ ...field, value: undefined })),
    );
  };

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
    throw new Error(
      "useCustomFieldsContext must be used within a CustomFieldsProvider",
    );
  }
  return context;
}
