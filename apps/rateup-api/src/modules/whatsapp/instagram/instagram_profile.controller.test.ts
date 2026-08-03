import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettingsByIbaId: vi.fn(),
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

import {
  getWaSettingsByIbaId,
  getWaSettingsById,
  updateWaSettingsById,
} from "../settings/wa_settings.service.js";
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
  getSettingsByIbaId: getWaSettingsByIbaId as unknown as Mock,
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
  m.getSettingsByIbaId.mockResolvedValue(settings());
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

  // resolveInstagramSettings raises a named, actionable error for a channel with
  // no Instagram account attached, and every catch used to flatten it into a
  // generic 500 — so the user was shown a server error for a setup step they
  // simply had not done.
  test("reports an unconnected Instagram account as a 409, with the reason", async () => {
    m.getSettingsById.mockResolvedValue(settings({ ibaId: null }));
    const rep = reply();

    await getInstagramProfileHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(409);
    expect(sent(rep).message).toBe("Instagram account is not connected for this channel");
  });

  test("still reports a genuine failure as a 500", async () => {
    m.getIceBreakers.mockRejectedValue(new Error("graph is down"));
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

    expect(m.updateSettings).toHaveBeenCalledWith(SETTINGS_ID, ORG_A, {
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

  // When syncWithMeta was not asked for the response still carried
  // `meta: { saved: true }`, which reads as though Meta had been updated when
  // nothing was sent to Meta at all.
  test("says plainly that Meta was not contacted", async () => {
    const rep = reply();

    await setInstagramIceBreakersHandler(request({ body: { iceBreakers: ICE_BREAKERS } }), rep);

    expect(sent(rep).data.meta).toEqual({ syncedWithMeta: false });
    expect(m.setIceBreakers).not.toHaveBeenCalled();
  });

  test("reports the Meta result when it was asked to sync", async () => {
    const rep = reply();

    await setInstagramIceBreakersHandler(
      request({ body: { iceBreakers: ICE_BREAKERS, syncWithMeta: true } }),
      rep,
    );

    expect(sent(rep).data.meta).toEqual({
      syncedWithMeta: true,
      result: { result: "success" },
    });
  });

  // The local draft used to be written before the Meta push, so a Meta refusal
  // answered 500 with our copy already changed — the UI showed the new ice
  // breakers while Instagram still served the old ones, and nothing reconciled
  // them. setInstagramIceBreakers writes our copy itself once Meta accepts, so the
  // handler no longer writes it up front.
  test("leaves our copy alone when the push to Meta fails", async () => {
    m.setIceBreakers.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await setInstagramIceBreakersHandler(
      request({ body: { iceBreakers: ICE_BREAKERS, syncWithMeta: true } }),
      rep,
    );

    expect(m.updateSettings).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(500);
  });
});

describe("deleteInstagramIceBreakersHandler", () => {
  // deleteInstagramIceBreakers clears our copy itself once Meta accepts, so the
  // handler no longer clears it up front.
  test("clears Meta's copy, which clears ours with it", async () => {
    const rep = reply();

    await deleteInstagramIceBreakersHandler(request(), rep);

    expect(m.deleteIceBreakers).toHaveBeenCalledWith(ORG_A, IBA_ID);
    expect(m.updateSettings).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("answers 404 for a channel belonging to another org", async () => {
    m.getSettingsById.mockResolvedValue(settings({ orgId: ORG_B }));
    const rep = reply();

    await deleteInstagramIceBreakersHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
  });

  // Same ordering as the setter. Our copy used to be emptied before Meta was
  // asked, so a refusal left the UI blank while Instagram still served the old
  // list.
  test("leaves our copy alone when Meta refuses the delete", async () => {
    m.deleteIceBreakers.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await deleteInstagramIceBreakersHandler(request(), rep);

    expect(m.updateSettings).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(500);
  });
});

describe("the persistent menu handlers", () => {
  // setInstagramPersistentMenu writes our copy itself once Meta accepts.
  test("pushes the menu to Meta, which saves our copy with it", async () => {
    const rep = reply();

    await setInstagramPersistentMenuHandler(
      request({ body: { persistentMenu: MENU, syncWithMeta: true } }),
      rep,
    );

    expect(m.setMenu).toHaveBeenCalledWith(MENU, ORG_A, IBA_ID);
    expect(m.updateSettings).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("saves the draft locally when it was not asked to sync", async () => {
    const rep = reply();

    await setInstagramPersistentMenuHandler(request({ body: { persistentMenu: MENU } }), rep);

    expect(m.updateSettings).toHaveBeenCalledWith(SETTINGS_ID, ORG_A, {
      instagramPersistentMenu: MENU,
    });
    expect(m.setMenu).not.toHaveBeenCalled();
    expect(sent(rep).data.meta).toEqual({ syncedWithMeta: false });
  });

  test("clears Meta's copy on a delete, which clears ours with it", async () => {
    const rep = reply();

    await deleteInstagramPersistentMenuHandler(request(), rep);

    expect(m.deleteMenu).toHaveBeenCalledWith(ORG_A, IBA_ID);
    expect(m.updateSettings).not.toHaveBeenCalled();
  });

  test("answers 404 for a channel belonging to another org", async () => {
    m.getSettingsById.mockResolvedValue(settings({ orgId: ORG_B }));
    const rep = reply();

    await setInstagramPersistentMenuHandler(request({ body: { persistentMenu: MENU } }), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(m.updateSettings).not.toHaveBeenCalled();
  });

  // Unlike the ice breakers, the menu handler applied no size or shape check at
  // all before storing whatever the body carried.
  test("refuses a menu with more than one entry for the same locale", async () => {
    const duplicated = [MENU[0], MENU[0]];
    const rep = reply();

    await setInstagramPersistentMenuHandler(request({ body: { persistentMenu: duplicated } }), rep);

    expect(rep.code).toHaveBeenCalledWith(400);
    expect(m.updateSettings).not.toHaveBeenCalled();
  });

  test("refuses a menu with no default locale", async () => {
    const rep = reply();

    await setInstagramPersistentMenuHandler(
      request({ body: { persistentMenu: [{ ...MENU[0], locale: "en_GB" }] } }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(400);
  });

  test("refuses a locale carrying more than three menu items", async () => {
    const tooMany = [
      {
        locale: "default",
        call_to_actions: Array.from({ length: 4 }, () => MENU[0].call_to_actions[0]),
      },
    ];
    const rep = reply();

    await setInstagramPersistentMenuHandler(request({ body: { persistentMenu: tooMany } }), rep);

    expect(rep.code).toHaveBeenCalledWith(400);
  });

  test("accepts an empty menu, which is how the UI clears it", async () => {
    const rep = reply();

    await setInstagramPersistentMenuHandler(request({ body: { persistentMenu: [] } }), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
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
  // answer.
  test("reports success with nothing in it after an ice-breaker sync", async () => {
    m.setIceBreakers.mockResolvedValue(undefined);
    const rep = reply();

    await syncInstagramIceBreakersHandler(request(), rep);

    expect(sent(rep)).toEqual({ success: true, data: undefined });
  });
});

describe("reading the account's own posts and stories", () => {
  test("lists the media of the caller's own account", async () => {
    const rep = reply();

    await getInstagramMediaHandler(request({ params: { ibaId: IBA_ID } }), rep);

    expect(m.getSettingsByIbaId).toHaveBeenCalledWith(IBA_ID);
    expect(m.getMedia).toHaveBeenCalledWith(IBA_ID);
    expect(sent(rep)).toEqual({ success: true, data: [{ id: "media-1" }] });
  });

  test("lists the stories of the caller's own account", async () => {
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

  // This was the serious one in this file. Both handlers took the Instagram
  // account id straight from the path and passed it to the service, which looks
  // that account's page token up by id alone — neither called the ownership check
  // the other seven handlers here all perform. The route is authenticated but was
  // not scoped, so any logged-in user who knew or guessed another org's Instagram
  // business account id got that account's last 50 posts and its live stories,
  // fetched with the victim's own page token. Same IDOR family as
  // and 11.1.
  //
  // 404, not 403: an account another org owns is indistinguishable from one that
  // does not exist, so this cannot be used to probe for account ids.
  test("answers 404 for another org's media, fetching nothing", async () => {
    m.getSettingsByIbaId.mockResolvedValue(settings({ orgId: ORG_A }));
    const rep = reply();

    await getInstagramMediaHandler(
      request({ user: { orgId: ORG_B }, params: { ibaId: IBA_ID } }),
      rep,
    );

    expect(m.getMedia).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(404);
  });

  // Same gap, same handler pair.
  test("answers 404 for another org's stories, fetching nothing", async () => {
    m.getSettingsByIbaId.mockResolvedValue(settings({ orgId: ORG_A }));
    const rep = reply();

    await getInstagramStoriesHandler(
      request({ user: { orgId: ORG_B }, params: { ibaId: IBA_ID } }),
      rep,
    );

    expect(m.getStories).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(404);
  });
});
