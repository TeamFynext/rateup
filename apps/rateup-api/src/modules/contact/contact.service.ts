import prisma from "../../utils/prisma";
import { CreateContactInput } from "./contact.schema";

export async function createContact(contact: CreateContactInput) {
    if (!contact.phone && !contact.email) {
        throw new Error('Phone or email must be provided');
    }
    const user = await prisma.contact.create({
        data: {
            teamId: contact.teamId,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
        }
    });
    return user;
}

export async function getContactById(contactId: string) {
    const user = await prisma.contact.findUnique({
        where: {
            id: contactId
        }
    });
    return user;
}

export async function getContactsByTeamId(teamId: string) {
    const users = await prisma.contact.findMany({
        where: {
            teamId
        }
    });
    return users;
}
export async function getContactsByOrgId(orgId: string) {
    const users = await prisma.contact.findMany({
        where: {
            team: {
                orgId
            }
        }
    });
    return users;
}

export async function deleteContactById(contactId: string) {
    const user = await prisma.contact.delete({
        where: {
            id: contactId
        }
    });
    return user;
}

export async function updateContactById(contactId: string, contact: CreateContactInput) {
    const user = await prisma.contact.update({
        where: {
            id: contactId
        },
        data: {
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
        }
    });
    return user;
}