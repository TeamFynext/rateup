import { Paper, PaperProps } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import styles from "./PaperLayout.module.css";
interface PaperLayoutProps extends PaperProps {
  hoveractive?: boolean;
  selected?: boolean;
  children?: JSX.Element | JSX.Element[];
  onClick?: (e?: any) => void;
}
export default function PaperLayout(props: PaperLayoutProps) {
  const { hovered, ref } = useHover();
  let {
    hoveractive,
    selected = true,
    className,
    radius = "lg",
    ...restProps
  } = props;

  const paperLayoutDivClassName = `${styles["paper-layout-div"]} ${className} ${
    selected ? styles["selected"] : ""
  } ${hovered && hoveractive ? styles["hovered-and-hover-active"] : ""} ${
    hoveractive ? styles["hover-active"] : ""
  }`;

  return (
    <Paper
      className={paperLayoutDivClassName}
      radius={radius}
      ref={ref}
      {...restProps}
      style={{
        ...props?.style,
      }}
    />
  );
}
