"use client";

import React from "react";
import { useRouter } from "next/navigation";

const Payment = () => {
  const router = useRouter();
  router.push(`/dashboard/settings?tab=account&view=billing`);
  return <div></div>;
};

export default Payment;
