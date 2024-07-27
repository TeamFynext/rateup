import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { getDictionary } from "../dictionaries/dictionaries";

const useTranslations = () => {
  const router = useRouter();
  const [translations, setTranslations] = useState({});
  const [loadingTranslations, setLoadingTranslations] = useState(true);

  useEffect(() => {
    const loadTranslations = async () => {
      const lang = await getDictionary(router.locale);
      setTranslations(lang);
      setLoadingTranslations(false);
    };

    loadTranslations();
  }, [router.locale]);

  return { translations, loadingTranslations };
};

export default useTranslations;
