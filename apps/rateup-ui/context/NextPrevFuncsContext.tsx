import { createContext, useContext } from "react";

const NextPrevFuncsContext = createContext({ nextFn: null, prevFn: null });

function NextPrevFuncsContextProvider({ nextFn, prevFn, children }) {
  return (
    <NextPrevFuncsContext.Provider
      value={{
        nextFn,
        prevFn,
      }}
    >
      {children}
    </NextPrevFuncsContext.Provider>
  );
}

function useHandleNextPrevFuncs() {
  return useContext(NextPrevFuncsContext);
}

export { NextPrevFuncsContextProvider, useHandleNextPrevFuncs };
