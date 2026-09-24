import QRCode from "qrcode";
import { type Ref, useMemo } from "react";

import { cn } from "@/lib/utils.ts";

import { LOGO_SIZE_BASE, TRANSPARENT } from "./qrDesign.ts";

const QUIET_ZONE = 2;

/**
 * The code as it downloads and prints. Colours and sizes are the owner's design, so they are
 * style values. The logo covers the middle, which is why the code uses the highest error
 * correction.
 */
export function QrArtboard({
  ref,
  value,
  code,
  background,
  logoSrc,
  logoSize,
  logoRadius,
  className,
}: Readonly<{
  ref?: Ref<HTMLDivElement>;
  value: string;
  code: string;
  background: string;
  logoSrc: string | null;
  logoSize: number;
  logoRadius: number;
  className?: string;
}>) {
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "H" });
    let d = "";
    for (let y = 0; y < modules.size; y++) {
      for (let x = 0; x < modules.size; x++) {
        if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { size: modules.size, path: d };
  }, [value]);

  const clear = background === TRANSPARENT;
  const box = size + QUIET_ZONE * 2;
  const logoPercent = Math.min(30, (logoSize / LOGO_SIZE_BASE) * 100);

  return (
    <div ref={ref} className={cn("relative aspect-square", className)}>
      <svg
        viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`}
        className="block size-full"
        shapeRendering="crispEdges"
        role="img"
        aria-hidden="true"
      >
        {!clear && (
          <rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={box} height={box} fill={background} />
        )}
        <path d={path} fill={code} />
      </svg>
      {logoSrc && (
        <img
          src={logoSrc}
          alt=""
          className="absolute top-1/2 left-1/2 -translate-1/2 object-contain p-[1.5%]"
          style={{
            width: `${logoPercent}%`,
            height: `${logoPercent}%`,
            borderRadius: `${logoRadius}%`,
            backgroundColor: clear ? "#ffffff" : background,
          }}
        />
      )}
    </div>
  );
}
