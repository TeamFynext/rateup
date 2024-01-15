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
  let { hoveractive, selected = true, ...restProps } = props;

  const propsClassname = restProps.className ? restProps.className : "";
  const selectedClassName = selected ? styles["selected"] : "";
  const hoveredClassName = hovered && hoveractive ? styles["hovered"] : "";
  const className = `${propsClassname} ${styles["paper-layout-component-div"]} ${selectedClassName} ${hoveredClassName}`;
  return (
    <Paper
      ref={ref}
      radius="lg"
      {...restProps}
      className={className}
      style={{
        ...props?.style,
      }}
    />
  );
}
