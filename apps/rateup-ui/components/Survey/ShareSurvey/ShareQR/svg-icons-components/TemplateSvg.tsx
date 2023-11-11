type TemplateSvgProps = {
  active?: boolean;
  className?: string;
};

function TemplateSvg({ active, className = "" }: TemplateSvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={30}
      height={31}
      fill="none"
      className={className}
      viewBox="0 0 30 31"
    >
      <path
        stroke={active ? "#3F5BA9" : "#595959"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M1.334 3.541a1.708 1.708 0 0 1 1.708-1.708H26.96a1.708 1.708 0 0 1 1.708 1.708v3.417a1.709 1.709 0 0 1-1.708 1.708H3.042a1.708 1.708 0 0 1-1.708-1.708V3.541Zm0 13.667A1.708 1.708 0 0 1 3.042 15.5h10.25a1.709 1.709 0 0 1 1.709 1.708v10.25a1.708 1.708 0 0 1-1.709 1.708H3.042a1.708 1.708 0 0 1-1.708-1.708v-10.25Zm20.5 0a1.709 1.709 0 0 1 1.708-1.708h3.417a1.709 1.709 0 0 1 1.708 1.708v10.25a1.709 1.709 0 0 1-1.708 1.708h-3.417a1.708 1.708 0 0 1-1.708-1.708v-10.25Z"
      />
    </svg>
  );
}

export default TemplateSvg;
