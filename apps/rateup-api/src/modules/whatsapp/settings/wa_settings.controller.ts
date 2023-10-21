import { FastifyReply, FastifyRequest } from "fastify";
import { createWaSettingsInput, updateWaSettingsInput } from "./wa_settings.schema";
import { getOrgIdAndRole } from "../../user/user.service";
import { Role } from "../../org/org.services";
import { createWaSettings, getWaSettings, updateWaSettings, upsertWaSettings } from "./wa_settings.service";
import { log } from "../../../utils/logger";

export async function createWaSettingsHandler(
    req: FastifyRequest<{ Body: createWaSettingsInput }>,
    res: FastifyReply
) {
    const org = await getOrgIdAndRole({ id: req.userId });
    if (org.role !== Role.SUPER_ADMIN) {
        return res.status(403).send({
            statusCode: 403,
            message: "You are not authorized to perform this action",
        });
    }
    const waSettings = await createWaSettings(org.orgId, req.body);
    return res.status(200).send(waSettings);
}

export async function getWaSettingsHandler(
    req: FastifyRequest,
    res: FastifyReply
) {
    const org = await getOrgIdAndRole({ id: req.userId });
    const waSettings = await getWaSettings(org.orgId);
    return res.status(200).send(waSettings);
}

export async function updateWaSettingsHandler(
    req: FastifyRequest<{ Body: updateWaSettingsInput }>,
    res: FastifyReply
) {
    const org = await getOrgIdAndRole({ id: req.userId });
    if (org.role !== Role.SUPER_ADMIN) {
        return res.status(403).send({
            statusCode: 403,
            message: "You are not authorized to perform this action",
        });
    }
    const waSettings = await updateWaSettings(org.orgId, req.body);
    return res.status(200).send(waSettings);
}

export async function upsertWaSettingsHandler(
    req: FastifyRequest<{ Body: createWaSettingsInput }>,
    res: FastifyReply
) {
    const org = await getOrgIdAndRole({ id: req.userId });
    if (org.role !== Role.SUPER_ADMIN) {
        return res.status(403).send({
            statusCode: 403,
            message: "You are not authorized to perform this action",
        });
    }
    const waSettings = await upsertWaSettings(org.orgId, req.body);
    return res.status(200).send(waSettings);
}