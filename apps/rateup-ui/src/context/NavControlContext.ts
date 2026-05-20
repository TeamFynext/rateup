"use client";

import { createContext, useContext } from "react";

export const NavControlContext = createContext({
  navOpened: true,
  setNavOpened: (navOpened: boolean) => {},
});

export const useNavControlContext = () => {
  return useContext(NavControlContext);
};
