import prisma from "../../../utils/prisma";
import { AddNewContactsToGroupInput, CreateContactGroupInput, RemoveGroupContactsSchema, UpdateContactGroupInput } from "./contactGroup.schema";

export async function getContactGroupById(contactGroupId: string) {
    const contactGroup = await prisma.contactGroup.findUnique({
        where: {
            id: contactGroupId
        },
        include:{
             _count: {
                select: {
                    contacts: true
                }
             }
        }
    });
    return contactGroup;
}
export async function getContactGroupsByTeamId(teamId: string) {
    const contactGroups = await prisma.contactGroup.findMany({
        where: {
            teamId
        },
        include: {
            _count: {
                select: {
                    contacts: true
                }
            }
        }
    });
    return contactGroups;
}
export async function getContactGroupsByOrgId(orgId: string) {
    const contactGroups = await prisma.contactGroup.findMany({
        where: {
            team: {
                orgId
            }
        },
        include: {
            _count: {
                select: {
                    contacts: true
                }
            }
        }
    });
    return contactGroups;

}
export async function createContactGroup(contactGroup: CreateContactGroupInput) {
    return await prisma.contactGroup.create({
        data: {
            name: contactGroup.name,
            icon: contactGroup.icon,
            teamId: contactGroup.teamId,
        }
    })
}

export async function getContactsByContactGroupId(contactGroupId:string){
    const group = await prisma.contactGroup.findUnique({
        where:{
            id:contactGroupId
        },
        include:{
            contacts:{
                include:{
                    contact:true,
                }
            }
        }
    })

   return group.contacts.map((c)=> c.contact)
}

export async function addNewContactsToGroup(contactGroupId: string, contacts: AddNewContactsToGroupInput) {
    const contactGroup = await getContactGroupById(contactGroupId);
    if (!contactGroup) {
        throw new Error("Contact group not found");
    }
    const { teamId } = contactGroup;

    // TODO: we could create uuid manually and skip the findMany query. 
    // TODO: check if below query can be optimized
    await prisma.$transaction(async (tx) => {
        // create contacts
        await tx.contact.createMany({
            data: contacts.map((contact) => ({
                ...contact,
                teamId
            }))
        });

        const createdContacts = await tx.contact.findMany({
            where: {
                OR: [
                    {
                        email: {
                            in: contacts.map((contact) => contact.email).filter((email) => email)
                        },
                    },
                    {
                        phone: {
                            in: contacts.map((contact) => contact.phone).filter((phone) => phone)
                        }
                    }
                ],
                teamId
            }
        })
        // create contact group map
        await tx.contactGroupMap.createMany({
            data: createdContacts.map((contact) => ({
                contactId: contact.id,
                contactGroupId
            }))
        })
    })

}

export async function addExistingContactsToGroup(contactGroupId: string, contactIds: Array<string>) {
    const contactGroup = await getContactGroupById(contactGroupId);
    if (!contactGroup) {
        throw new Error("Contact group not found");
    }
    // TODO: check if contactIds belong to the same team?
    return await prisma.contactGroupMap.createMany({
        data: contactIds.map((contactId) => ({ contactId, contactGroupId })),
    })
}

export async function updateContactGroup(contactGroupId: string, data: UpdateContactGroupInput) {
    return await prisma.contactGroup.update({
        where: {
            id: contactGroupId
        },
        data
    })
}

export async function deleteContactGroup(contactGroupId: string) {
    return await prisma.contactGroup.delete({
        where: {
            id: contactGroupId
        }
    })
}

export async function removeContactsFromGroup(contactGroupId:string, contactIds:RemoveGroupContactsSchema) {
   const participants = contactIds.map(c => ({contactId_contactGroupId: {
     contactId:c,
     contactGroupId:contactGroupId
   }}))
   return await prisma.contactGroup.update({
    where: {
      id: contactGroupId
    },
    data :{
      contacts: {
        delete: participants
      }
    }
   })
}