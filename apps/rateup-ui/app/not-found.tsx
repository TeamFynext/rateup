"use client";

import React from "react";

import NotFoundPage from "@/components/404/NotFound";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

const Error = () => {
  return (
    <Layout>
      <NotFoundPage />
      <HomePageFooter />
    </Layout>
  );
};

export default Error;
