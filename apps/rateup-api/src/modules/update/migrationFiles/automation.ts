import prisma from "../../../utils/prisma";

export const automationReplyUpdate = async () => {
  const waReplies: any = await prisma.waAutomatedReply.findMany({
    include: {
      team: {
        select: {
          orgId: true,
        },
      },
    },
  });

  for (const reply of waReplies) {
    if (!reply.matchData || !reply.matchData?.json) continue;

    const updatedMatchData = { ...reply.matchData };

    // Iterate through nodes
    updatedMatchData.json.nodes = updatedMatchData.json.nodes.map((node) => {
      if (node.data?.components) {
        node.data.components = node.data.components.map((component) => {
          if (component.type === "Image" && component.name?.image) {
            return {
              ...component,
              name: [
                {
                  id: crypto.randomUUID(),
                  value: component?.name?.image,
                  teamId: reply.teamId,
                },
              ],
            };
          }
          return component;
        });
      }
      return node;
    });
    await prisma.waAutomatedReply.update({
      where: { id: reply.id },
      data: { matchData: updatedMatchData, orgId: reply.team?.orgId },
    });
    if (updatedMatchData?.keywords?.length > 0) {
      try {
        await prisma.waAutomatedReplyCommands.createMany({
          data: updatedMatchData?.keywords?.map((c) => ({
            orgId: reply.team?.orgId,
            command: c,
            waAutomatedReplyId: reply?.id,
          })),
        });
      } catch (error) {
        console.log("🚀 ~ automationReplyUpdate ~ error:", error);
      }
    }
  }
};
