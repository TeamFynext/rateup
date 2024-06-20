import SuperTokens from "supertokens-node";

//Converting a string userId into a recipeUserId
export async function getAsRecipeUserIdType(userId: string) {
  return SuperTokens.convertToRecipeUserId(userId);
}

export async function getUserInfo(email) {
  return await SuperTokens.listUsersByAccountInfo("public", {
    email,
  });
}
