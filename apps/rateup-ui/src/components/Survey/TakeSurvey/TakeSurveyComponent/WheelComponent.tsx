import { useCallback, useEffect, useRef, useState } from "react";

interface WheelComponentProps {
  segments: string[]; // Array of segment labels
  segColors: string[]; // Array of colors for each segment
  winningSegment?: string; // Optional winning segment
  onFinished: (segment: string) => void; // Callback for when the wheel stops spinning
  onRotate?: () => void; // Callback for when the wheel starts spinning
  primaryColor?: string; // Optional primary color for the wheel
  primaryColoraround?: string; // Optional color around the primary color
  contrastColor?: string; // Optional contrast color for text
  buttonText?: string; // Optional text for the spin button
  isOnlyOnce?: boolean; // Optional flag to allow only one spin
  size?: number; // Optional size of the wheel
  upDuration?: number; // Optional duration for spinning up
  downDuration?: number; // Optional duration for spinning down
  fontFamily?: string; // Optional font family for text
  width?: number; // Optional width for the canvas
  height?: number; // Optional height for the canvas
  outerCircleWidth?: number; // Optional width of outer circle
  imageSrc?: string; // Optional background image src
  disable: boolean;
}

const WheelComponent = ({
  segments,
  segColors,
  winningSegment,
  onFinished,
  onRotate,
  primaryColor,
  primaryColoraround,
  contrastColor,
  buttonText,
  isOnlyOnce = true,
  size = 200,
  upDuration = 50,
  downDuration = 400,
  fontFamily = "geist",
  width = 600,
  height = 600,
  outerCircleWidth = 10,
  imageSrc,
  disable = false,
}: WheelComponentProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isStartedRef = useRef(false);
  const maxSpeedRef = useRef(Math.PI / segments.length);
  const framesRef = useRef(0);
  const spinStartRef = useRef(0);
  const timerHandleRef = useRef(0);
  const currentSegmentRef = useRef("");
  const angleCurrentRef = useRef(0);
  const angleDeltaRef = useRef(0);

  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const timerDelayRef = useRef(segments.length);
  const segmentLengthRef = useRef(segments.length);
  const maxSpeed = Math.PI / segmentLengthRef.current;
  const upTime = segmentLengthRef.current * upDuration;
  const downTime = segmentLengthRef.current * downDuration;
  const centerX = 300;
  const centerY = 300;

  // to draw each segment of a wheel
  const drawSegment = useCallback(
    (key: number, lastAngle: number, angle: number) => {
      const ctx = canvasContextRef.current;
      const value = segments[key];
      if (!ctx) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, size, lastAngle, angle, false);
      ctx.lineTo(centerX, centerY);
      ctx.closePath();
      ctx.fillStyle = imageSrc ? (isLoading ? "lightblue" : "transparent") : segColors[key];
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((lastAngle + angle) / 2);
      ctx.fillStyle = contrastColor || "white";
      ctx.font = "bold 1em " + fontFamily;
      const words = value.split(" ");
      let line = "";
      const lineHeight = 15;
      let lineCount = 0;

      words.forEach((word) => {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > size / 2 && line !== "") {
          ctx.fillText(line, size / 2 + 20, lineCount * lineHeight);
          line = word + " ";
          lineCount++;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, size / 2 + 20, lineCount * lineHeight);
      ctx.restore();
    },
    [contrastColor, fontFamily, imageSrc, isLoading, segColors, segments, size],
  );

  // to draw image in the circle shape in another canvas
  const drawImageToBuffer = useCallback(
    (callback: () => void) => {
      bufferCanvasRef.current = document.createElement("canvas");
      bufferCanvasRef.current.width = canvasContextRef.current.canvas.width;
      bufferCanvasRef.current.height = canvasContextRef.current.canvas.height;
      bufferContextRef.current = bufferCanvasRef.current.getContext("2d");

      const ctx = bufferContextRef.current;
      const PI2 = Math.PI * 2;
      if (!ctx) return;

      if (imageSrc) {
        const image = new Image();
        setIsLoading(() => true);
        image.src = imageSrc;
        image.onload = () => {
          const imgSize = size * 2;
          const imgRadius = size;
          ctx.save();

          // Create a circular clipping path
          ctx.beginPath();
          ctx.arc(centerX, centerY, imgRadius, 0, PI2, false);
          ctx.closePath();
          ctx.clip();

          // Draw the image within the clipped region
          ctx.drawImage(image, centerX - imgRadius, centerY - imgRadius, imgSize, imgSize);

          ctx.restore();

          // Call the callback function to continue drawing
          if (callback) {
            callback();
          }
        };
      }
    },
    [imageSrc, size],
  );

  // to get drawn image from second canvas and drawn to main canvas
  const drawImageFromBuffer = useCallback(() => {
    const ctx = canvasContextRef.current;
    if (bufferCanvasRef.current && ctx) {
      ctx.drawImage(bufferCanvasRef.current, 0, 0);
    }
  }, []);

  // to draw the inner and outer circle in canvas
  const drawWheel = useCallback(() => {
    const ctx = canvasContextRef.current;
    let lastAngle = angleCurrentRef.current;
    const len = segments.length;
    const PI2 = Math.PI * 2;
    if (!ctx) return;
    ctx.lineWidth = 1;
    ctx.strokeStyle = primaryColor || "black";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "1em " + fontFamily;
    for (let i = 1; i <= len; i++) {
      const angle = PI2 * (i / len) + angleCurrentRef.current;
      drawSegment(i - 1, lastAngle, angle);
      lastAngle = angle;
    }

    // Draw image inside the center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, PI2, false);
    ctx.closePath();
    ctx.fillStyle = primaryColoraround || "black";
    ctx.lineWidth = 5;
    ctx.strokeStyle = contrastColor || "white";
    ctx.fill();
    ctx.font = "2rem";
    ctx.fillStyle = contrastColor || "black";
    ctx.textAlign = "center";
    ctx.fillText(buttonText || "Spin", centerX, centerY + 3);
    ctx.stroke();

    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, size, 0, PI2, false);
    ctx.closePath();
    ctx.lineWidth = outerCircleWidth;
    ctx.strokeStyle = primaryColoraround || "white";
    ctx.stroke();
  }, [
    angleCurrentRef,
    buttonText,
    contrastColor,
    drawSegment,
    fontFamily,
    outerCircleWidth,
    primaryColor,
    primaryColoraround,
    segments.length,
    size,
  ]);

  // to draw drawNeedle in canvas
  const drawNeedle = useCallback(() => {
    const ctx = canvasContextRef.current;
    if (!ctx) return;
    ctx.lineWidth = 1;
    ctx.strokeStyle = contrastColor || "white";
    ctx.fillStyle = contrastColor || "white";
    ctx.beginPath();
    ctx.moveTo(centerX + 10, centerY - 40);
    ctx.lineTo(centerX - 10, centerY - 40);
    ctx.lineTo(centerX, centerY - 60);
    ctx.closePath();
    ctx.fill();
    const change = angleCurrentRef.current + Math.PI / 2;
    let i = segments.length - Math.floor((change / (Math.PI * 2)) * segments.length) - 1;
    if (i < 0) i = i + segments.length;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "transparent";
    ctx.font = "bold 1.5em " + fontFamily;
    currentSegmentRef.current = segments[i];
    if (isStartedRef) ctx.fillText(currentSegmentRef.current, centerX + 10, centerY + size + 50);
  }, [contrastColor, fontFamily, segments, size]);

  // all redrawing function to draw a wheel
  const wheelDraw = useCallback(() => {
    clear();
    if (imageSrc) drawImageFromBuffer();
    drawWheel();
    drawNeedle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawImageFromBuffer, drawNeedle, imageSrc]);

  // rotation timmer function
  const onTimerTick = useCallback(() => {
    framesRef.current++;
    wheelDraw();
    const duration = new Date().getTime() - spinStartRef.current;
    let progress = 0;
    let finished = false;
    if (duration < upTime) {
      progress = duration / upTime;
      angleDeltaRef.current = maxSpeed * Math.sin((progress * Math.PI) / 2);
    } else {
      if (winningSegment) {
        if (
          currentSegmentRef.current === winningSegment &&
          framesRef.current > segmentLengthRef.current
        ) {
          progress = duration / upTime;
          angleDeltaRef.current = maxSpeed * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
          progress = 1;
        } else {
          progress = duration / downTime;
          angleDeltaRef.current = maxSpeed * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
        }
      } else {
        progress = duration / downTime;
        if (progress >= 0.8) {
          angleDeltaRef.current =
            (maxSpeed / 1.2) * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
        } else if (progress >= 0.98) {
          angleDeltaRef.current = (maxSpeed / 2) * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
        } else angleDeltaRef.current = maxSpeed * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
      }
      if (progress >= 1) finished = true;
    }

    angleCurrentRef.current += angleDeltaRef.current;
    while (angleCurrentRef.current >= Math.PI * 2) angleCurrentRef.current -= Math.PI * 2;
    if (finished) {
      setIsFinished(true);
      onFinished(currentSegmentRef.current);
      clearInterval(timerHandleRef.current);
      timerHandleRef.current = 0;
      angleDeltaRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downTime, maxSpeed, upTime, winningSegment]);

  // function call spining actions
  const spin = useCallback(() => {
    isStartedRef.current = true;
    if (onRotate) onRotate();
    if (timerHandleRef.current === 0) {
      spinStartRef.current = new Date().getTime();
      maxSpeedRef.current = Math.PI / segmentLengthRef.current;
      framesRef.current = 0;
      timerHandleRef.current = window.setInterval(onTimerTick, timerDelayRef.current);
    }
  }, [onRotate, onTimerTick]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const ratio = window.devicePixelRatio;

    // Set canvas size multiplied by the device pixel ratio
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    // Scale down using CSS to fit the desired size
    canvas.style.width = `100%`;
    canvas.style.maxWidth = `${width}px`;
    canvas.style.maxHeight = `${height}px`;

    // Scale the context to ensure correct drawing operations
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    canvasContextRef.current = ctx;
    if (!disable) canvas.addEventListener("click", spin, false);
  }, [height, spin, width]);

  const wheelInit = useCallback(() => {
    initCanvas();
    if (imageSrc) {
      wheelDraw();
      drawImageToBuffer(() => {
        drawImageFromBuffer();
        wheelDraw();
      });
    } else {
      wheelDraw();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    drawImageFromBuffer,
    drawImageToBuffer,
    imageSrc,
    initCanvas,
    // wheelDraw
  ]);

  useEffect(() => {
    wheelInit();
  }, [wheelInit]);

  useEffect(() => {
    wheelDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, segColors, segments]);

  // clear entire canvas
  const clear = () => {
    const ctx = canvasContextRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, 600, 600);
  };
  return (
    <canvas
      ref={canvasRef}
      style={{
        pointerEvents: isFinished && isOnlyOnce ? "none" : "auto",
      }}
    />
  );
};
export default WheelComponent;
