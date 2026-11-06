import type { QRCodeErrorCorrectionLevel } from "qrcode";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

interface CustomQRCodeProps {
  textToBeEmbedded: string;
  version?: number;
  errorCorrectionLevel: QRCodeErrorCorrectionLevel;
  className?: string;
  qrColor?: string;
}

function CustomQRCode({
  textToBeEmbedded,
  version,
  errorCorrectionLevel,
  className,
  qrColor,
}: CustomQRCodeProps) {
  const [rows, setRows] = useState<React.JSX.Element[]>([]);
  const [qrcodeObj, setQrCodeObj] = useState<ReturnType<typeof QRCode.create> | null>(null);

  const drawQRModules = useCallback(() => {
    const qrCodeObj = QRCode.create(textToBeEmbedded, {
      version,
      errorCorrectionLevel,
    });
    setQrCodeObj(qrCodeObj);
    const { data: qrData, size } = qrCodeObj.modules;
    const rows = [];

    let tempRow = [];
    let x = 0;
    let y = 0;
    const width = 10;
    const height = 10;

    const checkIsFindingPatternModule = (i: number) => {
      if (
        (rows.length >= 0 &&
          rows.length < 7 &&
          (((i + 1) % size > 0 && (i + 1) % size < 8) ||
            (i + 1) % size > size - 7 ||
            (i + 1) % size === 0)) ||
        (rows.length >= size - 7 && rows.length < size && (i + 1) % size > 0 && (i + 1) % size < 8)
      ) {
        return true;
      }
      return false;
    };
    for (let i = 0; i < qrData.length; i++) {
      const findingPatternModuleTransform = `translate(${x} ${y})`;
      const dataModuleTransform = `translate(${x + width / 4} ${y + height / 4}) scale(1)`;
      const isFindingPatternModule = checkIsFindingPatternModule(i);

      const rect = (
        <rect
          className={`${qrData[i] === 0 ? "transparent" : "received-color"}`}
          key={`${i}`}
          width={width}
          height={height}
          transform={isFindingPatternModule ? findingPatternModuleTransform : dataModuleTransform}
          shapeRendering={"crispEdges"}
          // shapeRendering={isFindingPatternModule ? "crispEdges" : "auto"}
          // fill={qrData[i] === 0 ? "rgba(0, 0, 0, 0)" : `${qrColor?qrColor:'black'}`}
        />
      );
      tempRow.push(rect);
      x += 10;
      if (tempRow.length === size) {
        const group = <g key={`${rows.length}`}>{tempRow}</g>;
        rows.push(group);
        tempRow = [];
        x = 0;
        y += 10;
      }
    }
    setRows(rows);
  }, [textToBeEmbedded, version, errorCorrectionLevel, qrColor]);

  useEffect(() => {
    drawQRModules();
  }, [textToBeEmbedded, version, errorCorrectionLevel, qrColor]);

  const qrSize = qrcodeObj?.modules?.size;

  return (
    qrcodeObj && (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        viewBox={`0 0 ${(qrSize ?? 0) * 10} ${(qrSize ?? 0) * 10}`}
        className={className}
        width={qrSize ? qrSize : 300}
        height={qrSize ? qrSize : 300}
      >
        <style>
          {`
              .transparent {
                fill: rgba(0, 0, 0, 0)
              }
              .received-color {
                fill: ${qrColor}
              }
            `}
        </style>
        {rows}
      </svg>
    )
  );
}

export default CustomQRCode;
