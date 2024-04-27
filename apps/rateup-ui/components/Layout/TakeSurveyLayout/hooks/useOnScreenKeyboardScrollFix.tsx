import { useEffect } from "react";

const useOnScreenKeyboardScrollFix = () => {
  useEffect(() => {
    const handleScroll = () => {
      window.scrollTo(0, 0);
      console.log("scrolled", window.screenY);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
};

export default useOnScreenKeyboardScrollFix;
