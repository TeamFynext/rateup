"use client";

import { createContext, useContext } from "react";

const NavControlContext = createContext({
  navOpened: true,
  setNavOpened: (navOpened: boolean) => {},
});

export const useNavControlContext = () => {
  return useContext(NavControlContext);
};
