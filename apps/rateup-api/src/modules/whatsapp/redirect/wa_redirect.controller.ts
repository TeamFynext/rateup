import { FastifyReply, FastifyRequest } from "fastify";
import { getIp } from "../../../utils/http";
import { tokenizeIp } from "./wa_redirect.service";
import prisma from "../../../utils/prisma";

export async function tokenizeIpHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const ip = getIp(request);
  const token = await tokenizeIp(ip);
  reply.send({ token });
}

export async function getWaShareMessageFromSTMIdHandler(
  request: FastifyRequest<{
    Params: { surveyTeamMapShortId: string };
  }>,
  reply: FastifyReply,
) {
  const res = await prisma.waFlow.findFirst({
    where: {
      survey: {
        teams: {
          some: {
            shortUrlId: request.params.surveyTeamMapShortId,
          },
        },
      },
    },
    select: {
      org: {
        select: {
          name: true,
          WhatsappSettings: {
            select: {
              phone: true,
            },
          },
        },
      },
      survey: {
        select: {
          title: true,
          teams: {
            select: {
              team: {
                select: {
                  code: true,
                },
              },
              shortUrlId: true,
            },
          },
        },
      },
      startMessageConfig: true,
    },
  });

  if (!res) {
    reply.status(404).send({ message: "Flow not found" });
    return;
  }
  const teamCode = res.survey.teams.find(
    (t) => t.shortUrlId === request.params.surveyTeamMapShortId,
  )?.team.code;
  let phone = res.org.WhatsappSettings?.[0]?.phone;
  // remove + and spaces
  phone = phone.replace("+", "").replace(/\s/g, "");

  let message = "";
  message = res.startMessageConfig.prefix;
  message += `\n\`#${res.survey.title} @${teamCode}\`\n`;
  message += res.startMessageConfig.suffix;

  reply.send({
    shareUrl: generateWaMessageUrl(phone, message),
    title: res?.survey?.title,
    orgName: res?.org?.name,
  });
}

export function generateWaMessageUrl(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
