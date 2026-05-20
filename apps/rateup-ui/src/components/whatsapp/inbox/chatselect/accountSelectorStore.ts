import { create } from "zustand";
import { combine } from "zustand/middleware";

export const usePhoneIdStore = create(
  combine({ whatsappSettingsPhoneId: "" }, (set) => ({
    updatePhoneId: (phoneId: string) =>
      set(() => ({
        whatsappSettingsPhoneId: phoneId,
      })),
  })),
);
