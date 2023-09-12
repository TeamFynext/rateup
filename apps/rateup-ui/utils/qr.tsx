import html2canvas from "html2canvas";
import { MutableRefObject, Ref, RefObject } from "react";


export const downloadQrCode = async (elementToPrintRef: MutableRefObject<any>, fileName="qr-code", scale=3) => {
  const element = elementToPrintRef.current;
  const canvas = await html2canvas(element, { backgroundColor: null, scale });

  const data = canvas.toDataURL("image/jpg");
  const link = document.createElement("a");

  if (typeof link.download === "string") {
    link.href = data;
    link.download = `${fileName}.jpg}`

    document.body.appendChild(link);
    link.click();
  } else {
    window.open(data);
  }
};