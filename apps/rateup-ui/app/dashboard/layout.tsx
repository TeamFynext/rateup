import React from "react";
import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import { redirect } from "next/navigation";

import JsonWebToken from "jsonwebtoken";
import type { JwtHeader, JwtPayload, SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

import { appInfo } from "@/config/appInfo";
import { SessionAuthForNextJS } from "@/components/SuperToken/sessionAuthForNextJS";
import { TryRefreshComponent } from "@/components/SuperToken/tryRefreshClientComponent";

const client = jwksClient({
  jwksUri: `${appInfo.apiDomain}${appInfo.apiBasePath}/jwt/jwks.json`,
});

function getAccessToken(): string | undefined {
  return (cookies() as unknown as UnsafeUnwrappedCookies).get("sAccessToken")
    ?.value;
}

function getPublicKey(header: JwtHeader, callback: SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
}

async function verifyToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    JsonWebToken.verify(token, getPublicKey, {}, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as JwtPayload);
      }
    });
  });
}

/**
 * A helper function to retrieve session details on the server side.
 *
 * NOTE: This function does not use the getSSRSession function from the supertokens-node SDK
 * because getSession can update the access token. These updated tokens would not be
 * propagated to the client side, as request interceptors do not run on the server side.
 */
export async function getSSRSessionHelper(): Promise<{
  accessTokenPayload: JwtPayload | undefined;
  hasToken: boolean;
  error: Error | undefined;
}> {
  const accessToken = getAccessToken();
  const hasToken = !!accessToken;
  try {
    if (accessToken) {
      const decoded = await verifyToken(accessToken);
      return { accessTokenPayload: decoded, hasToken, error: undefined };
    }
    return { accessTokenPayload: undefined, hasToken, error: undefined };
  } catch (error) {
    if (error instanceof JsonWebToken.TokenExpiredError) {
      return { accessTokenPayload: undefined, hasToken, error: undefined };
    }
    return { accessTokenPayload: undefined, hasToken, error: error as Error };
  }
}
export default async function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessTokenPayload, hasToken, error } = await getSSRSessionHelper();

  if (error) {
    return (
      <div>
        Something went wrong while trying to get the session. Error -{" "}
        {error.message}
      </div>
    );
  }

  // `accessTokenPayload` will be undefined if it the session does not exist or has expired
  if (accessTokenPayload === undefined) {
    if (!hasToken) {
      /**
       * This means that the user is not logged in. If you want to display some other UI in this
       * case, you can do so here.
       */
      return redirect("/login");
    }

    /**
     * This means that the session does not exist but we have session tokens for the user. In this case
     * the `TryRefreshComponent` will try to refresh the session.
     *
     * To learn about why the 'key' attribute is required refer to: https://github.com/supertokens/supertokens-node/issues/826#issuecomment-2092144048
     */
    return <TryRefreshComponent key={Date.now()} />;
  }
  return <SessionAuthForNextJS>{children}</SessionAuthForNextJS>;
}
