import jwt from "supertokens-node/recipe/jwt/index.js";

export async function createJWT(payload: any) {
  let jwtResponse = await jwt.createJWT({
    ...payload,
    source: "microservice",
  });
  if (jwtResponse.status === "OK") {
    // Send JWT as Authorization header to M2
    return jwtResponse.jwt;
  }
  throw new Error("Unable to create JWT");
}
