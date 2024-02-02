import { createContext } from "react";

export const NavControlContext = createContext({
  navOpened: true,
  setNavOpened: (navOpened: boolean) => {},
});
