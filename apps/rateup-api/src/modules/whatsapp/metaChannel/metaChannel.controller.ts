import { FastifyReply, FastifyRequest } from "fastify";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { recordAuditEvent } from "../../../utils/auditLog.js";
import { invalidateChannelAccessCache } from "../settings/wa_channel_access.js";
import {
  exchangeLoginCode,
  listGrantedAccounts,
  readLogin,
  storeLogin,
} from "./metaChannel.login.js";
import {
  connectMetaChannel,
  deleteMetaChannel,
  getAccessibleMetaChannels,
  getMetaChannelById,
  MetaChannelConflictError,
  toPublicMetaChannel,
} from "./metaChannel.service.js";
import type {
  ConnectMetaChannelBody,
  MetaChannelListQuery,
  MetaChannelLoginBody,
  MetaChannelParams,
} from "./metaChannel.schema.js";

export async function getMetaChannelsHandler(
  req: FastifyRequest<{ Querystring: MetaChannelListQuery }>,
  reply: FastifyReply,
) {
  const channels = await getAccessibleMetaChannels(req.actor!, req.query.platform);
  return reply.send(channels.map(toPublicMetaChannel));
}

/**
 * Finishes a Messenger or Instagram login popup: trades the code, and returns what the login
 * was granted for that platform (without tokens) plus a `loginId` to connect them with.
 */
export async function metaChannelLoginHandler(
  req: FastifyRequest<{ Body: MetaChannelLoginBody }>,
  reply: FastifyReply,
) {
  const { orgId } = req.user;
  const { platform, code } = req.body;
  const accessToken = await exchangeLoginCode(code);
  const accounts = await listGrantedAccounts(platform, accessToken);
  const loginId = await storeLogin(orgId, platform, accessToken);

  const connected = await prisma.channel.findMany({
    where: { platform, accountId: { in: accounts.map((account) => account.accountId) } },
    select: { id: true, orgId: true, accountId: true },
  });
  const byAccount = new Map(connected.map((channel) => [channel.accountId, channel]));

  return reply.send({
    platform,
    loginId,
    accounts: accounts.map(({ pageAccessToken: _token, ...account }) => {
      const existing = byAccount.get(account.accountId);
      return {
        ...account,
        connectedChannelId: existing?.orgId === orgId ? existing.id : null,
        connectedElsewhere: Boolean(existing && existing.orgId !== orgId),
      };
    }),
  });
}

/**
 * Connects the picked accounts, one channel row each. Each is answered on its own, so one
 * account held by another org does not stop the rest.
 */
export async function connectMetaChannelHandler(
  req: FastifyRequest<{ Body: ConnectMetaChannelBody }>,
  reply: FastifyReply,
) {
  const { orgId } = req.user;
  const { platform, loginId, accountIds } = req.body;

  const accessToken = await readLogin(orgId, platform, loginId);
  if (!accessToken) {
    return reply.code(410).send({ message: "This Facebook login has expired. Log in again." });
  }

  // Read the accounts again with the login's token rather than trusting the browser: only
  // what this login was granted comes back with a token.
  const granted = new Map(
    (await listGrantedAccounts(platform, accessToken)).map((account) => [
      account.accountId,
      account,
    ]),
  );

  const results: {
    accountId: string;
    channel?: ReturnType<typeof toPublicMetaChannel>;
    error?: string;
  }[] = [];
  for (const accountId of new Set(accountIds)) {
    const account = granted.get(accountId);
    if (!account) {
      results.push({
        accountId,
        error:
          platform === PlatformType.INSTAGRAM
            ? "This Instagram account was not shared in the Facebook login"
            : "This Page was not shared in the Facebook login",
      });
      continue;
    }
    try {
      const channel = await connectMetaChannel(orgId, { platform, accessToken, ...account });
      await recordAuditEvent(req, "Channel added", {
        platform,
        accountId: channel.accountId,
        name: channel.username ?? channel.name,
      });
      results.push({ accountId, channel: toPublicMetaChannel(channel) });
    } catch (error) {
      if (!(error instanceof MetaChannelConflictError)) {
        log.error({ err: error, platform, accountId }, "Could not connect Meta channel");
      }
      results.push({
        accountId,
        error: error instanceof Error ? error.message : "Could not connect this account",
      });
    }
  }

  if (results.some((result) => result.channel)) invalidateChannelAccessCache(orgId);
  const connected = results.filter((result) => result.channel).length;
  return reply.code(connected ? 200 : 400).send({ results });
}

export async function deleteMetaChannelHandler(
  req: FastifyRequest<{ Params: MetaChannelParams }>,
  reply: FastifyReply,
) {
  const { orgId } = req.user;
  const channel = await getMetaChannelById(req.params.channelId, orgId);
  if (!channel) return reply.code(404).send({ message: "Channel not found" });

  await deleteMetaChannel(channel.id, orgId);
  invalidateChannelAccessCache(orgId);
  await recordAuditEvent(req, "Channel removed", {
    platform: channel.platform,
    accountId: channel.accountId,
    name: channel.username ?? channel.name,
  });
  return reply.send({ deleted: true });
}
