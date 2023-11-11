import { Paper, PaperProps } from "@mantine/core";
import { useHover } from "@mantine/hooks";
interface PaperLayoutProps extends PaperProps {
  hoveractive?: boolean;
  children?: JSX.Element;
  onClick?: (e?: any) => void;
}
export default function PaperLayout(props: PaperLayoutProps) {
  const { hovered, ref } = useHover();

  return (
    <Paper
      ref={props.hoveractive && ref}
      radius="lg"
      p="md"
      {...props}
      style={{
        ...props?.style,
        boxSizing: "border-box",
        boxShadow:
          "0px 0px 4px 0px rgba(0, 0, 0, 0.06), 0px 4px 4px 0px rgba(0, 0, 0, 0.03)",

        width: "100%",
        overflowX: "auto",
        border:
          hovered && props.hoveractive
            ? "2px solid var(--hover-border-color)"
            : "2px solid var(--primary-color)",
        cursor: props.hoveractive ? "pointer" : "default",
      }}
    />
  );
}
