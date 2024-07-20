import prisma from "../../../utils/prisma";

export async function updateEditorStructure() {
  console.log("Updating Surcey Editor........To Pages......");

  const surveys = await prisma.survey.findMany();

  // for (const survey of surveys) {

  // }

  console.log("Update.....");
}
