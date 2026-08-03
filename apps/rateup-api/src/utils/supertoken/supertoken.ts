import SuperTokens from "supertokens-node";
import { deleteUser } from "supertokens-node";

//Converting a string userId into a recipeUserId
export async function getAsRecipeUserIdType(userId: string) {
  return SuperTokens.convertToRecipeUserId(userId);
}

export async function getUserInfo(email: string, tenantId = "public") {
  return await SuperTokens.listUsersByAccountInfo(tenantId, {
    email,
  });
}

export async function deleteSuperTokenUserForId(userId: string) {
  console.log("Deleting User from SUPERTOKEN....");
  await deleteUser(userId); // this will succeed even if the userId didn't exist.
}
