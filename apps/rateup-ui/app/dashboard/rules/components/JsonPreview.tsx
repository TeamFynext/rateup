import React from "react";

interface JsonPreviewProps {
  data: any;
}

const JsonPreview: React.FC<JsonPreviewProps> = ({ data }) => (
  <div className="bg-gray-100 rounded p-4 text-xs font-mono overflow-x-auto border">
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
);

export default JsonPreview;
