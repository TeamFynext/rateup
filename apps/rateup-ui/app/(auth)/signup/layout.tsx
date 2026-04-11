import React from "react";

import { pageMetadata } from "@/lib/metadata";

import Signup from "./page";

export const metadata = pageMetadata["/signup"];

function SignupLayout() {
  return <Signup />;
}

export default SignupLayout;
