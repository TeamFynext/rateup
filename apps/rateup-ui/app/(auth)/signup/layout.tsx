import React from "react";
import { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";

import Signup from "./page";

export const metadata: Metadata = pageMetadata["/signup"];

function SignupLayout() {
  return <Signup />;
}

export default SignupLayout;
