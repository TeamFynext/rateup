import DOMPurify from "dompurify";
import { useEffect, useState } from "react";

const CustomHTML = ({ content = "<h1> Not Data found </h1>" }) => {
  const [htmlCode, setHtmlCode] = useState("");
  useEffect(() => {
    const convertEntitiesToHtml = (str: string) => {
      return str?.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    };

    const sanitizedOutput = DOMPurify.sanitize(convertEntitiesToHtml(content));
    setHtmlCode(sanitizedOutput);
  }, [content]);

  return <div dangerouslySetInnerHTML={{ __html: htmlCode }}></div>;
};

export default CustomHTML;
