type LogoSvgProps = {
  active?: boolean;
  className?: string;
};

function LogoSvg({ active, className = "" }: LogoSvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={40}
      height={35}
      fill="none"
      className={className}
      viewBox="0 0 40 35"
    >
      <path
        fill={active ? "#3F5BA9" : "#595959"}
        fillRule="evenodd"
        d="M20 .7 18.384 3.51 2.29 31.5.68 34.3h38.64l-1.61-2.8L21.615 3.51 20 .7Zm0 5.617L5.52 31.5h28.956L20 6.317Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default LogoSvg;
