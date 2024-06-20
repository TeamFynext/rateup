import { useRouter } from "next/router";
import React from "react";

const Payment = () => {
  const router = useRouter();
  router.push(`/dashboard/settings?activeTab=account&view=billing`);
  return <div></div>;
};

export default Payment;
