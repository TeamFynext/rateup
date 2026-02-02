interface ScreenshotProps {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
}

const Screenshot = ({ src, alt, width, height }: ScreenshotProps) => {
  return (
    <img
      src={src}
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
