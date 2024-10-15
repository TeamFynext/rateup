const dictionaries: any = {
  en: () => import("./en.json").then((module) => module.default),
  ar: () => import("./ar.json").then((module) => module.default),
  de: () => import("./de.json").then((module) => module.default),
  hi: () => import("./hi.json").then((module) => module.default),
  fr: () => import("./fr.json").then((module) => module.default),
};

export const getDictionary = async (locale: any) => dictionaries[locale]();
