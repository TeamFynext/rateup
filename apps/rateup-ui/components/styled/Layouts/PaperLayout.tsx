import { Paper, PaperProps } from "@mantine/core";
import { useHover } from "@mantine/hooks";
interface PaperLayoutProps extends PaperProps {
  hoveractive?: boolean;
  selected?: boolean;
  children?: JSX.Element;
  onClick?: (e?: any) => void;
}
export default function PaperLayout(props: PaperLayoutProps) {
  const { hovered, ref } = useHover();
  let { hoveractive, selected = true, ...restProps } = props;
  return (
    <Paper
      ref={ref}
      radius="lg"
      p="md"
      {...restProps}
      style={{
        ...props?.style,
        boxSizing: "border-box",
        boxShadow: selected
          ? "rgba(0, 0, 0, 0.05) 0px 1px 0px, rgba(0, 0, 0, 0.11) 0px 0px 8px"
          : "initial",
        width: "100%",
        overflowX: "auto",
        border:
          hovered && hoveractive
            ? "2px solid var(--hover-border-color)"
            : "2px solid var(--primary-color)",
        cursor: hoveractive ? "pointer" : "default",
      }}
    />
  );
}
