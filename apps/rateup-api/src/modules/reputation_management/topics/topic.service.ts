import { RM_Topic } from "@prisma/client"
import prisma from "../../../utils/prisma"

export async function createTopic(topic: Omit<RM_Topic, 'id'>) {
    const newTopic = await prisma.rM_Topic.create({
        data: topic
    })
    return newTopic
}
export async function getTopics(teamId: string) {
    const topics = await prisma.rM_Topic.findMany({
        where: {
            teamId
        }
    })
    return topics
}
export async function getTopic(id: string) {
    const topic = await prisma.rM_Topic.findUnique({
        where: {
            id
        }
    })
    return topic
}
export async function updateTopic(id: string, topic: Partial<RM_Topic>) {
    const updatedTopic = await prisma.rM_Topic.update({
        where: {
            id
        },
        data: topic
    })
    return updatedTopic
}
export async function deleteTopic(id: string) {
    const deletedTopic = await prisma.rM_Topic.delete({
        where: {
            id
        }
    })
    return deletedTopic
}