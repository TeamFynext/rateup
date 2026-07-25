interface ImagePlaceholderProps {
  /**
   * The file name the final screenshot should be uploaded as, relative to
   * `<CDN>/docs/screenshots/`. Example: `inbox/ticket-row.png`.
   */
  file: string;
  /** What the screenshot should show. Shown to the writer, not to end users. */
  shot: string;
  /** Optional caption rendered under the image once it is replaced. */
  caption?: string;
}

/**
 * A visible stand-in for a screenshot that has not been captured yet.
 *
 * Renders a dashed frame describing the shot to take and the file name to
 * upload, instead of a broken image. Replace the whole tag with
 * `<ScreenShot src={`/docs/screenshots/<file>`} alt="..." />` once the
 * image exists.
 */
const ImagePlaceholder = ({ file, shot, caption }: ImagePlaceholderProps) => {
  return (
    <figure
      style={{
        margin: "24px auto",
        padding: "24px",
        border: "2px dashed currentColor",
        borderRadius: "8px",
        opacity: 0.55,
        textAlign: "center",
        fontSize: "14px",
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontSize: "24px", marginBottom: "8px" }} aria-hidden="true">
        🖼️
      </div>
      <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "11px" }}>
        Screenshot to be added
      </div>
      <div style={{ marginTop: "8px" }}>{shot}</div>
      <code style={{ display: "inline-block", marginTop: "10px", fontSize: "12px" }}>
        docs/screenshots/{file}
      </code>
      {caption && <figcaption style={{ marginTop: "8px", fontSize: "13px" }}>{caption}</figcaption>}
    </figure>
  );
};

export default ImagePlaceholder;
