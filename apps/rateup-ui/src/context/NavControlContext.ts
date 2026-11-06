import { createContext, useContext } from "react";

const NavControlContext = createContext({
  navOpened: true,
  setNavOpened: (_navOpened: boolean) => {},
});

export const useNavControlContext = () => {
  return useContext(NavControlContext);
};
