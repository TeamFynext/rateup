import React from "react";

import DOMPurify from "dompurify";

const CustomHTML = ({ content = "<h1> Not Data found </h1>" }) => {
  const convertEntitiesToHtml = (str) => {
    return str?.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  };

  const sanitizedOutput = DOMPurify.sanitize(convertEntitiesToHtml(content));

  return <div dangerouslySetInnerHTML={{ __html: sanitizedOutput }}></div>;
};

export default CustomHTML;
