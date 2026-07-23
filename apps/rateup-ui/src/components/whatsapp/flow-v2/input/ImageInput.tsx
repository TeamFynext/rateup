import { useRef, useState } from "react";
import { toast } from "sonner";

import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";

import { FileConverter } from "./DataSource.tsx";

const ImageInput = (props) => {
  const resetRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearFile = () => {
    setError(null);
    resetRef.current?.();
    props.onChange("");
  };
  const handleFileChange = async (file: File) => {
    try {
      if (!file) return;
      if (file.size > 300000) {
        setError("max image size is 300KB");
        return;
      }
      setError(null);
      const base64String = await FileConverter.fileToBase64(file);
      props.onChange(base64String);
    } catch (error) {
      toast.error("Error converting file to Base64:" + JSON.stringify(error), {
        id: "file-converting",
      });
    }
  };
  return (
    <FileUploadButton
      clearFile={clearFile}
      handleFileChange={handleFileChange}
      resetRef={resetRef}
      fileSrc={props.value}
      error={error ?? undefined}
      style={{ marginTop: "25px" }}
      size="md"
      accept="image/png,image/jpeg"
    />
  );
};

export default ImageInput;
