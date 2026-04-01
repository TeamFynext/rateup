export function MetaBadge() {
  return (
    <>
      <div className="absolute w-[500px] h-[70px] rounded-full bg-blue-500 blur-[80px] opacity-50 z-0" />

      {/* Card */}
      <div className="relative z-10 flex items-center gap-2 bg-white rounded-full px-3 py-1">
        {/* Meta logo inline SVG */}
        <svg
          width="30"
          height="30"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 24.5C5 27.2 6.2 29.4 8 30.5C9.6 31.5 11.6 31.4 13.4 30.3L20 26.2L26.6 30.3C28.4 31.4 30.4 31.5 32 30.5C33.8 29.4 35 27.2 35 24.5V21C35 17.5 32.8 14.5 29.8 13.5C27.5 12.7 24.8 13.4 23 15.2L20 18.3L17 15.2C15.2 13.4 12.5 12.7 10.2 13.5C7.2 14.5 5 17.5 5 21V24.5Z"
            fill="url(#metaGrad)"
          />
          <defs>
            <linearGradient
              id="metaGrad"
              x1="5"
              y1="13"
              x2="35"
              y2="31"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#0081FB" />
              <stop offset="1" stop-color="#0064E0" />
            </linearGradient>
          </defs>
        </svg>

        <span className="text-base font-semibold text-grey-color-7 whitespace-nowrap">
          Meta Business Partner
        </span>
      </div>
    </>
  );
}
