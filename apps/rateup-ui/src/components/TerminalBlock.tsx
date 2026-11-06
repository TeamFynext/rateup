import React, { useState } from "react";
import { FaCheck, FaClipboard } from "react-icons/fa";

interface TerminalBlockProps {
  code: string;
  className?: string;
}

const TerminalBlock: React.FC<TerminalBlockProps> = ({ code, className }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`bg-gray-900 text-white p-4 rounded-md ${className ?? ""}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400 flex gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </span>
        <button
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-md flex items-center gap-2"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <FaCheck className="text-green-400" /> : <FaClipboard />}{" "}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="text-gray-300 bg-gray-800 p-4 rounded-md whitespace-pre overflow-x-auto">
          {code}
        </pre>
      </div>
    </div>
  );
};

export default TerminalBlock;
