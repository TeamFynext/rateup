"use client";

import React from "react";
import { useRouter } from "next/navigation";

const Payment = () => {
  const router = useRouter();
  router.push(`/dashboard/settings/billing`);
  return <div></div>;
};

export default Payment;
