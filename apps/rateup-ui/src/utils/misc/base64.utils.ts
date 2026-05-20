export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as base64."));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}
