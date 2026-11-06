import QRCode from "qrcode";
import { useMemo } from "react";

/**
 * A small, flat render of a saved design. `CustomQRCode` colours its modules through a global
 * `<style>` class, so several of them on one page all take the last one's colour.
 */
export function QrThumbnail({
  value,
  color = "#000000",
  background = "#FFFFFF",
  className,
}: Readonly<{ value: string; color?: string; background?: string; className?: string }>) {
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    let d = "";
    for (let y = 0; y < modules.size; y++) {
      for (let x = 0; x < modules.size; x++) {
        if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { size: modules.size, path: d };
  }, [value]);

  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      className={className}
      role="img"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect x={-2} y={-2} width={size + 4} height={size + 4} fill={background} />
      <path d={path} fill={color} />
    </svg>
  );
}
