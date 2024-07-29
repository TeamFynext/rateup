import { Button } from "@mantine/core";

interface Props {
  title: string;
  disabled?: boolean;
  //onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void | (() => void) | (() => Promise<void>)
  onClick?: any;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: string;
  size?: string;
  type?: any;
  radius?: string | number;
  sx?: any;
  loading?: boolean;
  fullWidth?: boolean;
  mr?: string;
  mt?: string;
  py?: string;
  pl?: string;
  pr?: string;
  pb?: string;
  pt?: string;
  ml?: string;
  styles?: any;
  mb?: string | number;
  color?: string;
  className?: string;
  gradient?: any;
  fw?: string | number;
  miw?: string | number;
  w?: string | number;
}

export const RateupButtonPrimary = ({
  loading,
  fullWidth,
  type,
  sx,
  radius,
  title,
  disabled,
  onClick,
  leftIcon = null,
  rightIcon = null,
  variant,
  size,
  color,
  gradient,
  className,
}: Props) => {
  return (
    <Button
      radius={radius || "lg"}
      style={{
        ...sx,
      }}
      disabled={disabled}
      leftSection={leftIcon}
      rightSection={rightIcon}
      onClick={onClick}
      variant={variant}
      size={size}
      type={type}
      fullWidth={fullWidth}
      loading={loading}
      fw={400}
      color={color}
      gradient={gradient}
      className={className}
    >
      {title}
    </Button>
  );
};

export const RateupButtonBlue = ({
  loading,
  title,
  radius,
  sx,
  disabled,
  onClick,
  leftIcon = null,
  rightIcon = null,
  variant,
  size,
  w = "fit-content",
  ...other
}: Props) => {
  return (
    <Button
      radius={radius || "lg"}
      px="xl"
      disabled={disabled}
      leftSection={leftIcon}
      rightSection={rightIcon}
      onClick={onClick}
      variant={variant || "filled"}
      size={size}
      style={sx}
      loading={loading}
      fw={400}
      {...other}
      w={w}
    >
      {title}
    </Button>
  );
};

export const RateupButtonSecondary = ({
  mt,
  fullWidth,
  type,
  loading,
  title,
  radius,
  sx,
  disabled,
  onClick,
  leftIcon = null,
  rightIcon = null,
  variant,
  size,
  color,
  fw = 400,
  w = "fit-content",
  ...other
}: Props) => {
  return (
    <Button
      radius={radius || "lg"}
      px="md"
      disabled={disabled}
      leftSection={leftIcon}
      rightSection={rightIcon}
      onClick={onClick}
      color={color ?? "var(--tertiary-color)"}
      size={size}
      style={sx}
      loading={loading}
      type={type}
      fullWidth={fullWidth}
      mt={mt}
      fw={fw}
      variant={variant || "outline"}
      w={w}
      {...other}
    >
      {title}
    </Button>
  );
};

export const RateupButtonOutline = ({
  title,
  disabled,
  onClick,
  leftIcon = null,
  rightIcon = null,
  variant,
  size,
  ...other
}: Props) => {
  return (
    <Button
      radius="lg"
      px="xl"
      style={{
        color: "black",
      }}
      disabled={disabled}
      color="yellow"
      leftSection={leftIcon}
      rightSection={rightIcon}
      onClick={onClick}
      variant="outline"
      size={size}
      {...other}
    >
      {title}
    </Button>
  );
};

export const RateupButtonBlackOutline = ({
  radius,
  title,
  disabled,
  onClick,
  leftIcon = null,
  rightIcon = null,
  variant,
  size,
  ...other
}: Props) => {
  return (
    <Button
      radius={radius}
      px="xl"
      disabled={disabled}
      color="dark"
      leftSection={leftIcon}
      rightSection={rightIcon}
      onClick={onClick}
      variant="outline"
      size={size}
      {...other}
    >
      {title}
    </Button>
  );
};

export const RateupIconButton = ({
  radius,
  sx,
  rightIcon = null,
  variant,
  ...other
}: Props) => {
  return (
    <Button
      radius={radius || "xs"}
      px={"xs"}
      variant={variant ?? "light"}
      style={sx}
      {...other}
    >
      {rightIcon}
    </Button>
  );
};
