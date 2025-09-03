import React from "react";
import { cookies } from "next/headers";

import Layout from "@/components/Layout/Layout";
import { SessionAuthForNextJS } from "@/components/SuperToken/sessionAuthForNextJS";
import { TryRefreshComponent } from "@/components/SuperToken/tryRefreshClientComponent";

import { getSessionForSSR } from "../util";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // TODO: Uncomment the following lines after 6 months to let all existing sessions to change to session with the subdomain
  // const cookiesFromReq = await cookies();
  // const cookiesArray: Array<{ name: string; value: string }> = Array.from(
  //   cookiesFromReq.getAll(),
  // ).map(({ name, value }) => ({
  //   name,
  //   value,
  // }));
  // const { accessTokenPayload, hasToken, error } =
  //   await getSessionForSSR(cookiesArray);

  // if (error) {
  //   return (
  //     <div>
  //       Something went wrong while trying to get the session. Error -{" "}
  //       {error.message}
  //     </div>
  //   );
  // }

  // // `accessTokenPayload` will be undefined if it the session does not exist or has expired
  // if (accessTokenPayload === undefined) {
  //   if (!hasToken) {
  //     /**
  //      * This means that the user is not logged in. If you want to display some other UI in this
  //      * case, you can do so here.
  //      */
  //     return redirect("/login");
  //   }

  //   /**
  //    * This means that the session does not exist but we have session tokens for the user. In this case
  //    * the `TryRefreshComponent` will try to refresh the session.
  //    *
  //    * To learn about why the 'key' attribute is required refer to: https://github.com/supertokens/supertokens-node/issues/826#issuecomment-2092144048
  //    */
  //   return <TryRefreshComponent key={Date.now()} />;
  // }

  // /**
  //  * SessionAuthForNextJS will handle proper redirection for the user based on the different session states.
  //  * It will redirect to the login page if the session does not exist etc.
  //  */
  return (
    <SessionAuthForNextJS>
      <Layout>{children}</Layout>
    </SessionAuthForNextJS>
  );
}
