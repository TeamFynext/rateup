import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../whatsapp/wa_axios.js", () => ({ callMetaApi: vi.fn() }));

import { callMetaApi } from "../whatsapp/wa_axios.js";
import {
  deleteMessengerProfileFields,
  getMessengerProfile,
  messengerProfileBody,
  parseMessengerProfile,
  setMessengerProfile,
} from "./messenger_profile.service.js";

const callMeta = callMetaApi as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseMessengerProfile", () => {
  test("reads every field of the default locale", () => {
    const profile = parseMessengerProfile({
      data: [
        {
          get_started: { payload: "START" },
          greeting: [
            { locale: "fr_FR", text: "Bonjour" },
            { locale: "default", text: "Hi {{user_first_name}}" },
          ],
          ice_breakers: [
            {
              locale: "default",
              call_to_actions: [{ question: "Prices?", payload: "PRICES" }],
            },
          ],
          persistent_menu: [
            {
              locale: "default",
              composer_input_disabled: false,
              call_to_actions: [
                { type: "postback", title: "Talk to us", payload: "AGENT" },
                { type: "web_url", title: "Shop", url: "https://shop.example" },
                { type: "nested", title: "Old" },
              ],
            },
          ],
        },
      ],
    });

    expect(profile).toEqual({
      getStarted: "START",
      greeting: "Hi {{user_first_name}}",
      iceBreakers: [{ question: "Prices?", payload: "PRICES" }],
      persistentMenu: [
        { type: "postback", title: "Talk to us", payload: "AGENT" },
        { type: "web_url", title: "Shop", url: "https://shop.example" },
      ],
    });
  });

  test("reads the older flat ice breakers list", () => {
    const profile = parseMessengerProfile({
      data: [{ ice_breakers: [{ question: "Hours?", payload: "HOURS" }] }],
    });
    expect(profile.iceBreakers).toEqual([{ question: "Hours?", payload: "HOURS" }]);
  });

  test("an empty profile has nothing set", () => {
    expect(parseMessengerProfile({ data: [] })).toEqual({
      getStarted: null,
      greeting: null,
      iceBreakers: [],
      persistentMenu: [],
    });
  });
});

describe("messengerProfileBody", () => {
  test("sends only the fields being set, in Meta's shape", () => {
    expect(messengerProfileBody({ greeting: "Hello" })).toEqual({
      greeting: [{ locale: "default", text: "Hello" }],
    });
    expect(
      messengerProfileBody({
        getStarted: "START",
        iceBreakers: [{ question: "Prices?", payload: "PRICES" }],
        persistentMenu: [{ type: "postback", title: "Agent", payload: "AGENT" }],
      }),
    ).toEqual({
      get_started: { payload: "START" },
      ice_breakers: [
        { locale: "default", call_to_actions: [{ question: "Prices?", payload: "PRICES" }] },
      ],
      persistent_menu: [
        {
          locale: "default",
          composer_input_disabled: false,
          call_to_actions: [{ type: "postback", title: "Agent", payload: "AGENT" }],
        },
      ],
    });
  });
});

describe("Messenger Profile API calls", () => {
  test("reads all four fields with the Page token", async () => {
    callMeta.mockResolvedValue({ data: { data: [{ get_started: { payload: "GO" } }] } });

    const profile = await getMessengerProfile("page-token");

    expect(profile.getStarted).toBe("GO");
    expect(callMeta).toHaveBeenCalledWith(
      "/me/messenger_profile",
      "GET",
      "page-token",
      undefined,
      {},
      {},
      { fields: "get_started,greeting,ice_breakers,persistent_menu" },
    );
  });

  test("sets and deletes through the same endpoint", async () => {
    callMeta.mockResolvedValue({ data: { result: "success" } });

    await setMessengerProfile("page-token", { getStarted: "GO" });
    await deleteMessengerProfileFields("page-token", ["get_started", "persistent_menu"]);

    expect(callMeta).toHaveBeenNthCalledWith(1, "/me/messenger_profile", "POST", "page-token", {
      get_started: { payload: "GO" },
    });
    expect(callMeta).toHaveBeenNthCalledWith(2, "/me/messenger_profile", "DELETE", "page-token", {
      fields: ["get_started", "persistent_menu"],
    });
  });
});
