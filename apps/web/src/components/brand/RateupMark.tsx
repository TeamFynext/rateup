import { useId } from "react";

interface RateupMarkProps {
  /** Rendered height in px; the width follows the mark's own ratio. */
  size?: number;
  className?: string;
  /** Accessible name. Omit when the mark sits beside the wordmark. */
  title?: string;
}

/**
 * The RateUp star, inline. Local rather than the CloudFront PNG so a canvas export (the QR
 * poster) never has to fetch it cross-origin. Gradient ids are scoped per instance — two
 * marks on one page would otherwise share, and the second would paint with the first's.
 */
export function RateupMark({ size = 20, className, title }: Readonly<RateupMarkProps>) {
  const uid = useId();
  const g0 = `${uid}-star`;
  const g1 = `${uid}-core`;
  const width = (size * 54.2) / 51.2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 54.2 51.2"
      width={width}
      height={size}
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient
          id={g0}
          x1="31.499"
          y1="-4.60423"
          x2="64.4282"
          y2="37.2259"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFD54C" />
          <stop offset="1" stopColor="#F8951D" />
        </linearGradient>
        <linearGradient
          id={g1}
          x1="9.57184"
          y1="-22.1075"
          x2="75.5031"
          y2="41.662"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFD54C" />
          <stop offset="1" stopColor="#F8951D" />
        </linearGradient>
      </defs>
      <g transform="translate(-31.1 0)">
        <path
          d="M84.2478 21.6911L75.6025 30.0125L71.3787 24.2821C70.1137 22.5619 68.2377 21.3748 66.1246 20.9576C64.0115 20.5404 61.8165 20.9237 59.9773 22.0311C59.3246 22.2843 58.7082 22.6201 58.1434 23.0301C56.3089 24.353 55.0797 26.3378 54.7241 28.5512C54.3685 30.7646 54.9154 33.0268 56.2454 34.844L64.9763 46.7054L58.1381 43.1601L44.2692 50.3402C43.9576 50.5018 43.6153 50.5976 43.2641 50.6214C42.9128 50.6452 42.5604 50.5966 42.2293 50.4785C41.8983 50.3604 41.5958 50.1755 41.3413 49.9357C41.0868 49.6959 40.8858 49.4063 40.7512 49.0855C40.5695 48.6578 40.513 48.1885 40.5881 47.7307L43.2346 32.5139L32.0069 21.7253C31.6682 21.3996 31.4288 20.9869 31.3157 20.5339C31.2026 20.0809 31.2203 19.6058 31.3669 19.1622C31.5135 18.7187 31.7831 18.3244 32.1452 18.0242C32.5073 17.7239 32.9474 17.5296 33.4158 17.4632L48.9207 15.2438L55.8524 1.39235C56.0618 0.974388 56.3855 0.622492 56.7871 0.376443C57.1886 0.130394 57.6519 0 58.1247 0C58.5975 0 59.0608 0.130394 59.4624 0.376443C59.8639 0.622492 60.1876 0.974388 60.397 1.39235L67.3287 15.2438L82.8337 17.4632C83.2979 17.5321 83.7335 17.7267 84.0921 18.0255C84.4506 18.3242 84.718 18.7152 84.8644 19.155C85.0107 19.5948 85.0303 20.066 84.921 20.5161C84.8117 20.9662 84.5777 21.3776 84.2452 21.7043L84.2478 21.6911Z"
          fill={`url(#${g0})`}
        />
        <path
          d="M70.1105 29.5422C70.1117 30.8232 69.6622 32.0649 68.8387 33.0557C68.0151 34.0465 66.8686 34.7249 65.5945 34.9754C64.3204 35.226 62.9976 35.033 61.8517 34.4295C60.7057 33.8259 59.8076 32.8492 59.3103 31.6657C58.813 30.4822 58.7475 29.1654 59.1247 27.9396C59.502 26.7138 60.2988 25.6549 61.3793 24.9436C62.4597 24.2323 63.757 23.9124 65.0498 24.0387C66.3427 24.1649 67.5511 24.7293 68.4691 25.6358C69.519 26.6725 70.1092 28.0772 70.1105 29.5422Z"
          fill={`url(#${g1})`}
        />
        <path
          d="M67.6565 48.0908L64.8817 46.6543L56.1508 34.8324C54.8208 33.0152 54.2739 30.753 54.6295 28.5396C54.9851 26.3262 56.2143 24.3414 58.0488 23.0185C58.6148 22.6104 59.231 22.2747 59.8827 22.0195C59.6848 22.1381 59.4924 22.262 59.2999 22.3991C57.4654 23.722 56.2362 25.7068 55.8806 27.9202C55.525 30.1336 56.0718 32.3958 57.4019 34.213L67.6565 48.0908Z"
          fill="#E6E7E8"
        />
      </g>
    </svg>
  );
}
