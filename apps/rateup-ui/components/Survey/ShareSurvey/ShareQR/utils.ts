const getLogoSrc = (logoFile) => {
  if (logoFile instanceof File) {
    const logoUrl = URL.createObjectURL(logoFile);
    return logoUrl;
  } else if (typeof logoFile === "string") {
    return logoFile;
  } else {
    return `/images/rateup-star.svg`;
  }
};

const getLogoFileValueForFileInput = (logoFile) => {
  let valueToBeReturned = null;
  if (logoFile instanceof File) {
    valueToBeReturned = logoFile;
  }
  return valueToBeReturned;
};

export { getLogoSrc, getLogoFileValueForFileInput };
