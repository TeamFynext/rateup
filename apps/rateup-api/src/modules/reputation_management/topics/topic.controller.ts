import { RM_Topic } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";
import { createTopic, deleteTopic, getTopics, updateTopic } from "./topic.service";
import { ByTeamIdParams } from "../../team/team.schema";


export async function createTopicHandler(
    req: FastifyRequest<{
        Body: Omit<RM_Topic, 'id'>
    }>,
    res: FastifyReply
) {
    const newTopic = createTopic(req.body)
    res.send(newTopic)
}

export async function getTopicsHandler(
    req: FastifyRequest<{
        Params: ByTeamIdParams
    }>,
    res: FastifyReply
) {
    const topics = await getTopics(req.params.teamId)
    res.send(topics)
}

export async function updateTopicHandler(
    req: FastifyRequest<{
        Params: { id: string }
        Body: Partial<RM_Topic>
    }>,
    res: FastifyReply
) {
    const updatedTopic = await updateTopic(req.params.id, req.body)
    res.send(updatedTopic)
}

export async function deleteTopicHandler(
    req: FastifyRequest<{
        Params: { id: string }
    }>,
    res: FastifyReply
) {
    const deletedTopic = await deleteTopic(req.params.id)
    res.send(deletedTopic)
}
