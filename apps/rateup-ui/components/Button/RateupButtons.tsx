import { MutableRefObject } from "react";

import {
  ActionIcon,
  ActionIconProps,
  Button,
  ButtonProps,
  FileButton,
  Group,
  HoverCard,
  Image,
  MantineStyleProp,
} from "@mantine/core";
import { IconRestore, IconTrash, IconUpload } from "@tabler/icons-react";

import { DEFAULT_IMAGE_BASE64_START } from "@/utils/constants";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

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
  w,
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
      loading={loading}
      fw={400}
      {...other}
      w={w ?? undefined}
      style={sx}
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
  w,
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
      color={color}
      size={size}
      style={sx}
      loading={loading}
      type={type}
      fullWidth={fullWidth}
      mt={mt}
      fw={fw}
      variant={variant || "outline"}
      w={w ?? undefined}
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

type RateupFileUploadButtonProps = {
  resetRef: MutableRefObject<() => void>;
  handleFileChange: (file: File) => Promise<void>;
  clearFile: () => void;
  fileButton?: ButtonProps;
  resetButton?: ActionIconProps;
  type?: "file" | "image";
  fileSrc?: string | { id: string; image: string };
  accept?: string;
  error?: string;
  style?: MantineStyleProp;
  size?: "xs" | "sm" | "md" | "lg";
  rightSection?: React.ReactNode;
};
export const RateupFileUploadButton = ({
  resetRef,
  handleFileChange,
  fileSrc,
  fileButton,
  resetButton,
  type = "image",
  accept = "image/png,image/jpeg,image/gif,image/webp",
  clearFile,
  error,
  style,
  size = "lg",
  rightSection,
}: RateupFileUploadButtonProps) => {
  const url = rightSection
    ? typeof fileSrc === "string"
      ? getFileUrlFromKey(fileSrc)
      : `${DEFAULT_IMAGE_BASE64_START}${fileSrc}`
    : typeof fileSrc === "object"
      ? getFileUrlFromKey(fileSrc.image)
      : `${DEFAULT_IMAGE_BASE64_START}${fileSrc}`;
  return (
    <Group gap={4} style={style}>
      {fileSrc && (
        <HoverCard width={280} shadow="md" position="top" withArrow>
          <HoverCard.Target>
            <Image src={url} h={35} alt="img" />
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Image src={url} alt="choice-preview" mah={400} />
          </HoverCard.Dropdown>
        </HoverCard>
      )}

      <FileButton
        onChange={handleFileChange}
        accept={accept}
        resetRef={resetRef}
      >
        {(props) => (
          <Button
            variant="outline"
            rightSection={<IconUpload size={16} />}
            radius={"md"}
            color={error && "red"}
            size={"sm"}
            p={0}
            style={{
              flexGrow: 1,
            }}
            {...fileButton}
            {...props}
          >
            {error || (fileSrc ? "Replace" : "Select" + ` ${type}`)}
          </Button>
        )}
      </FileButton>
      <ActionIcon
        disabled={!fileSrc}
        color="red"
        radius={"md"}
        onClick={clearFile}
        size={size}
        {...resetButton}
      >
        {fileSrc ? <IconTrash /> : <IconRestore />}
      </ActionIcon>
      {rightSection}
    </Group>
  );
};
