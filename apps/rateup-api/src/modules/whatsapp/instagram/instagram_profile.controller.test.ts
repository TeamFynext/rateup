import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettingsById: vi.fn(),
  updateWaSettingsById: vi.fn(),
}));
vi.mock("./instagram_messaging.service.js", () => ({
  deleteInstagramIceBreakers: vi.fn(),
  deleteInstagramPersistentMenu: vi.fn(),
  getInstagramIceBreakers: vi.fn(),
  getInstagramMediaPosts: vi.fn(),
  getInstagramPersistentMenu: vi.fn(),
  getInstagramStories: vi.fn(),
  setInstagramIceBreakers: vi.fn(),
  setInstagramPersistentMenu: vi.fn(),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { getWaSettingsById, updateWaSettingsById } from "../settings/wa_settings.service.js";
import {
  deleteInstagramIceBreakers,
  deleteInstagramPersistentMenu,
  getInstagramIceBreakers,
  getInstagramMediaPosts,
  getInstagramPersistentMenu,
  getInstagramStories,
  setInstagramIceBreakers,
  setInstagramPersistentMenu,
} from "./instagram_messaging.service.js";
import {
  deleteInstagramIceBreakersHandler,
  deleteInstagramPersistentMenuHandler,
  getInstagramMediaHandler,
  getInstagramProfileHandler,
  getInstagramStoriesHandler,
  setInstagramIceBreakersHandler,
  setInstagramPersistentMenuHandler,
  syncInstagramIceBreakersHandler,
  syncInstagramPersistentMenuHandler,
} from "./instagram_profile.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  deleteIceBreakers: deleteInstagramIceBreakers as unknown as Mock,
  deleteMenu: deleteInstagramPersistentMenu as unknown as Mock,
  getIceBreakers: getInstagramIceBreakers as unknown as Mock,
  getMedia: getInstagramMediaPosts as unknown as Mock,
  getMenu: getInstagramPersistentMenu as unknown as Mock,
  getSettingsById: getWaSettingsById as unknown as Mock,
  getStories: getInstagramStories as unknown as Mock,
  setIceBreakers: setInstagramIceBreakers as unknown as Mock,
  setMenu: setInstagramPersistentMenu as unknown as Mock,
  updateSettings: updateWaSettingsById as unknown as Mock,
};

const ORG_A = "org-a";
const ORG_B = "org-b";
const SETTINGS_ID = "settings-1";
const IBA_ID = "iba-1";

const ICE_BREAKERS = [{ question: "Opening hours?", payload: "HOURS" }];
const MENU = [{ locale: "default", call_to_actions: [{ type: "postback", title: "Shop" }] }];

function settings(overrides: Record<string, unknown> = {}): any {
  return {
    id: SETTINGS_ID,
    orgId: ORG_A,
    ibaId: IBA_ID,
    instagramIceBreakers: ICE_BREAKERS,
    instagramPersistentMenu: MENU,
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}): any {
  return {
    user: { orgId: ORG_A, userId: "user-1" },
    params: { whatsappSettingsId: SETTINGS_ID },
    body: {},
    ...overrides,
  };
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

/** The body the handler answered with. */
function sent(rep: any, index = 0) {
  return rep.send.mock.calls[index][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getSettingsById.mockResolvedValue(settings());
  m.updateSettings.mockResolvedValue({});
  m.getIceBreakers.mockResolvedValue({ ice_breakers: ICE_BREAKERS });
  m.getMenu.mockResolvedValue({ persistent_menu: MENU });
  m.setIceBreakers.mockResolvedValue({ result: "success" });
  m.setMenu.mockResolvedValue({ result: "success" });
  m.deleteIceBreakers.mockResolvedValue({ result: "success" });
  m.deleteMenu.mockResolvedValue({ result: "success" });
  m.getMedia.mockResolvedValue([{ id: "media-1" }]);
  m.getStories.mockResolvedValue([{ id: "story-1" }]);
});

describe("getInstagramProfileHandler", () => {
  test("returns the ice breakers and the persistent menu together", async () => {
    const rep = reply();

    await getInstagramProfileHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(sent(rep)).toEqual({
      success: true,
      data: { iceBreakers: ICE_BREAKERS, persistentMenu: MENU },
    });
  });

  test("unwraps a bare array just as happily as a wrapped one", async () => {
    m.getIceBreakers.mockResolvedValue(ICE_BREAKERS);
    m.getMenu.mockResolvedValue(MENU);
    const rep = reply();

    await getInstagramProfileHandler(request(), rep);

    expect(sent(rep).data).toEqual({ iceBreakers: ICE_BREAKERS, persistentMenu: MENU });
  });

  test("reports nothing rather than failing on a shape it does not recognise", async () => {
    m.getIceBreakers.mockResolvedValue({ data: [{ ice_breakers: ICE_BREAKERS }] });
    const rep = reply();

    await getInstagramProfileHandler(request(), rep);

    expect(sent(rep).data.iceBreakers).toEqual([]);
  });

  test("answers 404 for a channel that belongs to another org", async () => {
    m.getSettingsById.mockResolvedValue(settings({ orgId: ORG_B }));
    const rep = reply();

    await getInstagramProfileHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(m.getIceBreakers).not.toHaveBeenCalled();
  });

  test("answers 404 for a channel that does not exist", async () => {
    m.getSettingsById.mockResolvedValue(null);
    const rep = reply();

    await getInstagramProfileHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
  });

  test("answers 500 when Meta cannot be reached", async () => {
    m.getIceBreakers.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await getInstagramProfileHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });

  // NOTE: pins current behaviour. resolveInstagramSettings throws a named,
  // actionable error for a WhatsApp channel with no Instagram account attached —
  // "Instagram account is not connected for this channel" — and the catch turns it
  // into a generic 500 "Failed to fetch Instagram profile settings". The user is
  // shown a server error for what is really a setup step they have not done.
  // Every handler in this file behaves the same way. See issues.txt 12.14.
  test("reports an unconnected Instagram account as a server error", async () => {
    m.getSettingsById.mockResolvedValue(settings({ ibaId: null }));
    const rep = reply();

    await getInstagramProfileHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
    expect(sent(rep).message).toBe("Failed to fetch Instagram profile settings");
  });
});

describe("setInstagramIceBreakersHandler", () => {
  test("saves the draft locally and leaves Meta alone by default", async () => {
    const rep = reply();

    await setInstagramIceBreakersHandler(request({ body: { iceBreakers: ICE_BREAKERS } }), rep);

    expect(m.updateSettings).toHaveBeenCalledWith(SETTINGS_ID, {
      instagramIceBreakers: ICE_BREAKERS,
    });
    expect(m.setIceBreakers).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("pushes to Meta when the caller asks for it", async () => {
    await setInstagramIceBreakersHandler(
      request({ body: { iceBreakers: ICE_BREAKERS, syncWithMeta: true } }),
      reply(),
    );

    expect(m.setIceBreakers).toHaveBeenCalledWith(ICE_BREAKERS, ORG_A, IBA_ID);
  });

  test("refuses more ice breakers than Instagram allows", async () => {
    const tooMany = Array.from({ length: 5 }, (_, i) => ({ question: `q${i}`, payload: `p${i}` }));
    const rep = reply();

    await setInstagramIceBreakersHandler(request({ body: { iceBreakers: tooMany } }), rep);

    expect(rep.code).toHaveBeenCalledWith(400);
    expect(m.updateSettings).not.toHaveBeenCalled();
  });

  test("accepts exactly four", async () => {
    const four = Array.from({ length: 4 }, (_, i) => ({ question: `q${i}`, payload: `p${i}` }));
    const rep = reply();

    await setInstagramIceBreakersHandler(request({ body: { iceBreakers: four } }), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("answers 404 for a channel belonging to another org", async () => {
    m.getSettingsById.mockResolvedValue(settings({ orgId: ORG_B }));
    const rep = reply();

    await setInstagramIceBreakersHandler(request({ body: { iceBreakers: ICE_BREAKERS } }), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(m.updateSettings).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. When syncWithMeta is not asked for, the response
  // still carries `meta: { saved: true }` — which reads as though Meta was updated.
  // Nothing was sent to Meta at all. See issues.txt 12.14.
  test("claims a Meta result even when Meta was never contacted", async () => {
    const rep = reply();

    await setInstagramIceBreakersHandler(request({ body: { iceBreakers: ICE_BREAKERS } }), rep);

    expect(sent(rep).data.meta).toEqual({ saved: true });
    expect(m.setIceBreakers).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. The local draft is written before the Meta push,
  // so a Meta refusal answers 500 with our copy already changed — the UI shows the
  // new ice breakers while Instagram still serves the old ones. Every set/delete
  // handler in this file has the same ordering. See issues.txt 12.13.
  test("has already saved our copy when the push to Meta fails", async () => {
    m.setIceBreakers.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await setInstagramIceBreakersHandler(
      request({ body: { iceBreakers: ICE_BREAKERS, syncWithMeta: true } }),
      rep,
    );

    expect(m.updateSettings).toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(500);
  });
});

describe("deleteInstagramIceBreakersHandler", () => {
  test("clears our copy and Meta's", async () => {
    const rep = reply();

    await deleteInstagramIceBreakersHandler(request(), rep);

    expect(m.updateSettings).toHaveBeenCalledWith(SETTINGS_ID, { instagramIceBreakers: [] });
    expect(m.deleteIceBreakers).toHaveBeenCalledWith(ORG_A, IBA_ID);
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("answers 404 for a channel belonging to another org", async () => {
    m.getSettingsById.mockResolvedValue(settings({ orgId: ORG_B }));
    const rep = reply();

    await deleteInstagramIceBreakersHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
  });

  // NOTE: same ordering as the setter. See issues.txt 12.13.
  test("has already cleared our copy when Meta refuses the delete", async () => {
    m.deleteIceBreakers.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await deleteInstagramIceBreakersHandler(request(), rep);

    expect(m.updateSettings).toHaveBeenCalledWith(SETTINGS_ID, { instagramIceBreakers: [] });
    expect(rep.code).toHaveBeenCalledWith(500);
  });
});

describe("the persistent menu handlers", () => {
  test("saves the menu locally and pushes it when asked", async () => {
    const rep = reply();

    await setInstagramPersistentMenuHandler(
      request({ body: { persistentMenu: MENU, syncWithMeta: true } }),
      rep,
    );

    expect(m.updateSettings).toHaveBeenCalledWith(SETTINGS_ID, { instagramPersistentMenu: MENU });
    expect(m.setMenu).toHaveBeenCalledWith(MENU, ORG_A, IBA_ID);
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("clears our copy and Meta's on a delete", async () => {
    const rep = reply();

    await deleteInstagramPersistentMenuHandler(request(), rep);

    expect(m.updateSettings).toHaveBeenCalledWith(SETTINGS_ID, { instagramPersistentMenu: [] });
    expect(m.deleteMenu).toHaveBeenCalledWith(ORG_A, IBA_ID);
  });

  test("answers 404 for a channel belonging to another org", async () => {
    m.getSettingsById.mockResolvedValue(settings({ orgId: ORG_B }));
    const rep = reply();

    await setInstagramPersistentMenuHandler(request({ body: { persistentMenu: MENU } }), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(m.updateSettings).not.toHaveBeenCalled();
  });

  // NOTE: unlike the ice breakers, the menu handler applies no size or shape check
  // at all before storing whatever the body carries. See issues.txt 12.14.
  test("stores a menu of any size without checking it", async () => {
    const huge = Array.from({ length: 50 }, () => MENU[0]);
    const rep = reply();

    await setInstagramPersistentMenuHandler(request({ body: { persistentMenu: huge } }), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(m.updateSettings.mock.calls[0][1].instagramPersistentMenu).toHaveLength(50);
  });
});

describe("the sync handlers", () => {
  test("pushes the stored ice-breaker draft to Meta", async () => {
    await syncInstagramIceBreakersHandler(request(), reply());

    expect(m.setIceBreakers).toHaveBeenCalledWith(ICE_BREAKERS, ORG_A, IBA_ID);
  });

  test("pushes the stored menu draft to Meta", async () => {
    await syncInstagramPersistentMenuHandler(request(), reply());

    expect(m.setMenu).toHaveBeenCalledWith(MENU, ORG_A, IBA_ID);
  });

  test("pushes an empty list for a channel with no draft saved", async () => {
    m.getSettingsById.mockResolvedValue(settings({ instagramIceBreakers: null }));

    await syncInstagramIceBreakersHandler(request(), reply());

    expect(m.setIceBreakers).toHaveBeenCalledWith([], ORG_A, IBA_ID);
  });

  test("answers 500 when Meta refuses the sync", async () => {
    m.setMenu.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await syncInstagramPersistentMenuHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });

  // NOTE: pins current behaviour. setInstagramIceBreakers unwraps Meta's answer one
  // time too many and resolves to undefined (see
  // instagram_messaging.service.test.ts), and the handler hands that straight back
  // as its `data`. The menu sync, which is otherwise identical, returns Meta's
  // answer. See issues.txt 12.12.
  test("reports success with nothing in it after an ice-breaker sync", async () => {
    m.setIceBreakers.mockResolvedValue(undefined);
    const rep = reply();

    await syncInstagramIceBreakersHandler(request(), rep);

    expect(sent(rep)).toEqual({ success: true, data: undefined });
  });
});

describe("reading the account's own posts and stories", () => {
  test("lists the media of the account named in the path", async () => {
    const rep = reply();

    await getInstagramMediaHandler(request({ params: { ibaId: IBA_ID } }), rep);

    expect(m.getMedia).toHaveBeenCalledWith(IBA_ID);
    expect(sent(rep)).toEqual({ success: true, data: [{ id: "media-1" }] });
  });

  test("lists the stories of the account named in the path", async () => {
    const rep = reply();

    await getInstagramStoriesHandler(request({ params: { ibaId: IBA_ID } }), rep);

    expect(sent(rep)).toEqual({ success: true, data: [{ id: "story-1" }] });
  });

  test("answers 500 when Meta cannot be reached", async () => {
    m.getMedia.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await getInstagramMediaHandler(request({ params: { ibaId: IBA_ID } }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });

  // NOTE: pins current behaviour, and this is the serious one in this file. These
  // two handlers take the Instagram account id straight from the path and pass it
  // to the service, which looks the account's page token up by that id alone. They
  // never call resolveInstagramSettings — the ownership check the other seven
  // handlers here all perform. The route is authenticated but not scoped, so any
  // logged-in user who knows (or guesses) another org's Instagram business account
  // id gets that account's last 50 posts and its live stories, with captions,
  // media urls and permalinks. Same IDOR family as issues.txt 1.1 and 11.1.
  // See issues.txt 12.15.
  test("lists another org's media given its Instagram account id", async () => {
    const rep = reply();

    await getInstagramMediaHandler(
      request({ user: { orgId: ORG_B }, params: { ibaId: IBA_ID } }),
      rep,
    );

    expect(m.getSettingsById).not.toHaveBeenCalled();
    expect(m.getMedia).toHaveBeenCalledWith(IBA_ID);
    expect(sent(rep).success).toBe(true);
  });

  // NOTE: same gap, same handler pair. See issues.txt 12.15.
  test("lists another org's stories given its Instagram account id", async () => {
    const rep = reply();

    await getInstagramStoriesHandler(
      request({ user: { orgId: ORG_B }, params: { ibaId: IBA_ID } }),
      rep,
    );

    expect(m.getSettingsById).not.toHaveBeenCalled();
    expect(sent(rep).success).toBe(true);
  });
});
