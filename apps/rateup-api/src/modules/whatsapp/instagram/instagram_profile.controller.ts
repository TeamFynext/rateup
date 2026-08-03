import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../utils/logger.js";
import { getWaSettingsById, updateWaSettingsById } from "../settings/wa_settings.service.js";
import {
  deleteInstagramIceBreakers,
  deleteInstagramPersistentMenu,
  getInstagramIceBreakers,
  getInstagramPersistentMenu,
  getInstagramMediaPosts,
  getInstagramStories,
  setInstagramIceBreakers,
  setInstagramPersistentMenu,
} from "./instagram_messaging.service.js";

interface InstagramProfileParams {
  whatsappSettingsId: string;
}

// resolveInstagramSettings always guards `ibaId` before returning, so callers can rely
// on it being present without a non-null assertion at every use site.
type InstagramWaSettings = NonNullable<Awaited<ReturnType<typeof getWaSettingsById>>> & {
  ibaId: string;
};

// The getters return either the stored draft (a bare array) or Meta's read-back envelope
// ({ ice_breakers: [...] } / { persistent_menu: [...] }), so both shapes are unwrapped here.
function normalizeIceBreakers(data: unknown): InstagramIceBreaker[] {
  if (Array.isArray(data)) return data as InstagramIceBreaker[];
  const wrapped = (data as { ice_breakers?: unknown } | null | undefined)?.ice_breakers;
  if (Array.isArray(wrapped)) return wrapped as InstagramIceBreaker[];
  return [];
}

function normalizePersistentMenu(data: unknown): InstagramPersistentMenuEntry[] {
  if (Array.isArray(data)) return data as InstagramPersistentMenuEntry[];
  const wrapped = (data as { persistent_menu?: unknown } | null | undefined)?.persistent_menu;
  if (Array.isArray(wrapped)) return wrapped as InstagramPersistentMenuEntry[];
  return [];
}

async function resolveInstagramSettings(
  whatsappSettingsId: string,
  orgId: string,
): Promise<InstagramWaSettings | null> {
  const settings = await getWaSettingsById(whatsappSettingsId);

  if (!settings || settings.orgId !== orgId) {
    return null;
  }

  const { ibaId } = settings;
  if (!ibaId) {
    throw new Error("Instagram account is not connected for this channel");
  }

  return { ...settings, ibaId };
}

export async function getInstagramProfileHandler(
  request: FastifyRequest<{ Params: InstagramProfileParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const settings = await resolveInstagramSettings(request.params.whatsappSettingsId, orgId);

    if (!settings) {
      return reply.code(404).send({
        success: false,
        message: "Instagram settings not found",
      });
    }

    const [iceBreakersRaw, persistentMenuRaw] = await Promise.all([
      getInstagramIceBreakers(orgId, settings.ibaId),
      getInstagramPersistentMenu(orgId, settings.ibaId),
    ]);

    const iceBreakers = normalizeIceBreakers(iceBreakersRaw);
    const persistentMenu = normalizePersistentMenu(persistentMenuRaw);

    return reply.code(200).send({
      success: true,
      data: {
        iceBreakers,
        persistentMenu,
      },
    });
  } catch (error) {
    log.error({ err: error }, "[Instagram Profile] Error fetching profile settings");
    return reply.code(500).send({
      success: false,
      message: "Failed to fetch Instagram profile settings",
    });
  }
}

export async function setInstagramIceBreakersHandler(
  request: FastifyRequest<{
    Params: InstagramProfileParams;
    Body: {
      iceBreakers: Array<{ question: string; payload: string }>;
      syncWithMeta?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const settings = await resolveInstagramSettings(request.params.whatsappSettingsId, orgId);

    if (!settings) {
      return reply.code(404).send({
        success: false,
        message: "Instagram settings not found",
      });
    }

    if (request.body.iceBreakers.length > 4) {
      return reply.code(400).send({
        success: false,
        message: "Instagram supports up to 4 ice breakers",
      });
    }

    await updateWaSettingsById(settings.id, {
      instagramIceBreakers: request.body.iceBreakers,
    });

    let metaResult: unknown = { saved: true };
    if (request.body.syncWithMeta) {
      metaResult = await setInstagramIceBreakers(request.body.iceBreakers, orgId, settings.ibaId);
    }

    return reply.code(200).send({
      success: true,
      data: {
        saved: request.body.iceBreakers,
        meta: metaResult,
      },
    });
  } catch (error) {
    log.error({ err: error }, "[Instagram Profile] Error setting ice breakers");
    return reply.code(500).send({
      success: false,
      message: "Failed to set Instagram ice breakers",
    });
  }
}

export async function deleteInstagramIceBreakersHandler(
  request: FastifyRequest<{ Params: InstagramProfileParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const settings = await resolveInstagramSettings(request.params.whatsappSettingsId, orgId);

    if (!settings) {
      return reply.code(404).send({
        success: false,
        message: "Instagram settings not found",
      });
    }

    await updateWaSettingsById(settings.id, {
      instagramIceBreakers: [],
    });

    const data = await deleteInstagramIceBreakers(orgId, settings.ibaId);

    return reply.code(200).send({ success: true, data });
  } catch (error) {
    log.error({ err: error }, "[Instagram Profile] Error deleting ice breakers");
    return reply.code(500).send({
      success: false,
      message: "Failed to delete Instagram ice breakers",
    });
  }
}

export async function setInstagramPersistentMenuHandler(
  request: FastifyRequest<{
    Params: InstagramProfileParams;
    Body: {
      persistentMenu: Array<{
        locale: string;
        call_to_actions: Array<{
          type: "postback" | "web_url";
          title: string;
          payload?: string;
          url?: string;
        }>;
      }>;
      syncWithMeta?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const settings = await resolveInstagramSettings(request.params.whatsappSettingsId, orgId);

    if (!settings) {
      return reply.code(404).send({
        success: false,
        message: "Instagram settings not found",
      });
    }

    await updateWaSettingsById(settings.id, {
      instagramPersistentMenu: request.body.persistentMenu,
    });

    let metaResult: unknown = { saved: true };
    if (request.body.syncWithMeta) {
      metaResult = await setInstagramPersistentMenu(
        request.body.persistentMenu,
        orgId,
        settings.ibaId,
      );
    }

    return reply.code(200).send({
      success: true,
      data: {
        saved: request.body.persistentMenu,
        meta: metaResult,
      },
    });
  } catch (error) {
    log.error({ err: error }, "[Instagram Profile] Error setting persistent menu");
    return reply.code(500).send({
      success: false,
      message: "Failed to set Instagram persistent menu",
    });
  }
}

export async function deleteInstagramPersistentMenuHandler(
  request: FastifyRequest<{ Params: InstagramProfileParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const settings = await resolveInstagramSettings(request.params.whatsappSettingsId, orgId);

    if (!settings) {
      return reply.code(404).send({
        success: false,
        message: "Instagram settings not found",
      });
    }

    await updateWaSettingsById(settings.id, {
      instagramPersistentMenu: [],
    });

    const data = await deleteInstagramPersistentMenu(orgId, settings.ibaId);

    return reply.code(200).send({ success: true, data });
  } catch (error) {
    log.error({ err: error }, "[Instagram Profile] Error deleting persistent menu");
    return reply.code(500).send({
      success: false,
      message: "Failed to delete Instagram persistent menu",
    });
  }
}

export async function syncInstagramIceBreakersHandler(
  request: FastifyRequest<{ Params: InstagramProfileParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const settings = await resolveInstagramSettings(request.params.whatsappSettingsId, orgId);

    if (!settings) {
      return reply.code(404).send({
        success: false,
        message: "Instagram settings not found",
      });
    }

    const draft = settings.instagramIceBreakers ?? [];
    const data = await setInstagramIceBreakers(draft, orgId, settings.ibaId);
    return reply.code(200).send({ success: true, data });
  } catch (error) {
    log.error({ err: error }, "[Instagram Profile] Error syncing ice breakers");
    return reply.code(500).send({
      success: false,
      message: "Failed to sync Instagram ice breakers to Meta",
    });
  }
}

export async function syncInstagramPersistentMenuHandler(
  request: FastifyRequest<{ Params: InstagramProfileParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const settings = await resolveInstagramSettings(request.params.whatsappSettingsId, orgId);

    if (!settings) {
      return reply.code(404).send({
        success: false,
        message: "Instagram settings not found",
      });
    }

    const draft = settings.instagramPersistentMenu ?? [];
    const data = await setInstagramPersistentMenu(draft, orgId, settings.ibaId);
    return reply.code(200).send({ success: true, data });
  } catch (error) {
    log.error({ err: error }, "[Instagram Profile] Error syncing persistent menu");
    return reply.code(500).send({
      success: false,
      message: "Failed to sync Instagram persistent menu to Meta",
    });
  }
}

export async function getInstagramMediaHandler(
  request: FastifyRequest<{ Params: { ibaId: string } }>,
  reply: FastifyReply,
) {
  try {
    const data = await getInstagramMediaPosts(request.params.ibaId);
    return reply.code(200).send({ success: true, data });
  } catch (error) {
    log.error({ err: error }, "[Instagram Profile] Error fetching media posts");
    return reply.code(500).send({ success: false, message: "Failed to fetch Instagram media" });
  }
}

export async function getInstagramStoriesHandler(
  request: FastifyRequest<{ Params: { ibaId: string } }>,
  reply: FastifyReply,
) {
  try {
    const data = await getInstagramStories(request.params.ibaId);
    return reply.code(200).send({ success: true, data });
  } catch (error) {
    log.error({ err: error }, "[Instagram Profile] Error fetching stories");
    return reply.code(500).send({ success: false, message: "Failed to fetch Instagram stories" });
  }
}
