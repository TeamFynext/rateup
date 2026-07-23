import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

import { FileConverter } from "./DataSource.tsx";

const MIN_IMAGES = 1;

interface CarouselImage {
  src: string;
  "alt-text": string;
}

const ImageCarouselInput = (props) => {
  const MAX_IMAGES = props.maxImages || 3;
  const resetRefs = useRef<Array<React.MutableRefObject<(() => void) | null>>>([]);
  const [images, setImages] = useState<CarouselImage[]>([{ src: "", "alt-text": "" }]);

  const getResetRef = (idx: number) => {
    if (!resetRefs.current[idx]) resetRefs.current[idx] = { current: null };
    return resetRefs.current[idx];
  };

  const commit = (next: CarouselImage[]) => {
    setImages(next);
    props.onChange(next);
  };

  useEffect(() => {
    if (props.value?.length > 0) {
      setImages(props.value);
    }
  }, [props.value]);

  const handleFileChange = async (file: File, idx: number) => {
    try {
      if (!file) return;
      if (file.size > 400000) {
        toast.error("Max image size is 400KB");
        return;
      }
      const base64String = await FileConverter.fileToBase64(file);
      commit(images.map((img, i) => (i === idx ? { ...img, src: base64String } : img)));
    } catch (error) {
      toast.error("Error converting file to Base64:" + JSON.stringify(error), {
        id: "file-converting",
      });
    }
  };

  const handleAltTextChange = (value: string, idx: number) => {
    commit(images.map((img, i) => (i === idx ? { ...img, "alt-text": value } : img)));
  };

  const clearFile = (idx: number, altText: string) => {
    commit(images.map((img, i) => (i === idx ? { src: "", "alt-text": altText } : img)));
    getResetRef(idx).current?.();
  };

  const addImage = () => {
    if (images.length < MAX_IMAGES) {
      commit([...images, { src: "", "alt-text": "" }]);
    }
  };

  const removeImage = (idx: number) => {
    if (images.length > MIN_IMAGES) {
      commit(images.filter((_, i) => i !== idx));
      getResetRef(idx).current?.();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {images.map((img, idx) => (
          <Card key={idx} className="gap-2 rounded-md p-4">
            <FileUploadButton
              clearFile={() => clearFile(idx, img?.["alt-text"])}
              handleFileChange={(file) => handleFileChange(file, idx)}
              resetRef={getResetRef(idx)}
              fileSrc={img.src}
              error={props.errors?.[`images.${idx}.src`] as string}
              size="md"
              accept="image/png,image/jpeg"
              className="w-full"
            />
            <div className="flex flex-col gap-1">
              <Label>Alt Text *</Label>
              <Input
                placeholder="Describe this image"
                value={img["alt-text"]}
                onChange={(e) => handleAltTextChange(e.target.value, idx)}
                aria-invalid={!!props.errors?.[`images.${idx}.alt-text`]}
              />
              {props.errors?.[`images.${idx}.alt-text`] && (
                <p className="text-xs text-red-500">
                  {props.errors[`images.${idx}.alt-text`] as string}
                </p>
              )}
            </div>
            {images.length > MIN_IMAGES && (
              <Button
                variant="destructive"
                onClick={() => removeImage(idx)}
                size="sm"
                className="mt-2"
              >
                <span>x</span>
                Remove Image
              </Button>
            )}
          </Card>
        ))}
      </div>

      {images.length < MAX_IMAGES && (
        <Button variant="secondary" onClick={addImage} className="mt-2.5 self-start">
          + Add Image ({images.length}/{MAX_IMAGES})
        </Button>
      )}
    </div>
  );
};

export default ImageCarouselInput;
