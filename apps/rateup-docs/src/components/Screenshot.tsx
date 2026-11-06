import { CDN } from "@/lib/cdn";

interface ScreenshotProps {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  /**
   * Served from this repo's `public/` folder instead of the CDN. For a shot captured but not
   * uploaded yet: keep `src` the CDN path (`/docs/screenshots/...`), save the file at
   * `public/docs/screenshots/...`, and drop `local` once it is on the CDN.
   */
  local?: boolean;
}

const Screenshot = ({ src, alt, width, height, local }: ScreenshotProps) => {
  return (
    <img
      src={local ? src : `${CDN}${src}`}
      alt={alt}
      width={width || "80%"}
      height={height || "auto"}
      style={{
        margin: "auto",
        marginTop: "20px",
        boxShadow: "10px 10px 20px rgba(0, 0, 0, 0.1)",
        borderRadius: "5px",
      }}
      loading="lazy"
    />
  );
};

export default Screenshot;
