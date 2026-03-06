import { useEffect, useState } from "react";

const useLocalStorage = <T,>(
  keyName: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window !== "undefined") {
      const savedItem = localStorage.getItem(keyName);
      const parsedItem = JSON.parse(savedItem || "{}");
      return parsedItem || initialValue;
    }
    return initialValue;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(keyName, JSON.stringify(value));
    }
  }, [keyName, value]);

  return [value, setValue];
};

export default useLocalStorage;
