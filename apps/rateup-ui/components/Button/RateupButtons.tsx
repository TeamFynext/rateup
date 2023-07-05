import { Button } from '@mantine/core';
interface Props {
    title: string;
    disabled?: boolean
    onClick?: () => void;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    variant?: string;
    size?: string;
    type?: any
    radius?: string
    sx?: any
    loading?: boolean
}

export const RateupButtonPrimary = ({ type, sx,radius,  title, disabled, onClick, leftIcon = null, rightIcon = null, variant, size }: Props) => {
    return (
        <Button
        radius={radius || "lg"}
            px="xl"
            style={{
                color: "black",
            }}
            disabled={disabled}
            color='yellow'
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            onClick={onClick}
            variant={variant}
            size= {size}
            type={type}
            sx={sx}
        >
            {title}
        </Button >
    )
}

export const RateupButtonBlue = ({ title, radius, sx, disabled, onClick, leftIcon = null, rightIcon = null, variant, size }: Props) => {
    return (
        <Button
            radius={radius || "lg"}
            px="xl"
            disabled={disabled}
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            onClick={onClick}
            variant="gradient" gradient={{ from: '#62CBE6', to: '#3F5BA9' }}
            size= {size}
            sx={sx}
        >
            {title}
        </Button >
    )
}

export const RateupButtonSecondary = ({ type, loading, title, radius, sx, disabled, onClick, leftIcon = null, rightIcon = null, variant, size }: Props) => {
    return (
        <Button
            radius={radius || "lg"}
            px="xl"
            disabled={disabled}
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            onClick={onClick}
            color="dark"
            size= {size}
            sx={sx}
            loading={loading}
            type={type}
        >
            {title}
        </Button >
    )
}

export const RateupButtonOutline = ({ title, disabled, onClick, leftIcon = null, rightIcon = null, variant, size }: Props) => {
    return (
        <Button
            radius="lg"
            px="xl"
            style={{
                color: "black",
            }}
            disabled={disabled}
            color='yellow'
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            onClick={onClick}
            variant="outline" 
            size= {size}
        >
            {title}
        </Button >
    )
}

export const RateupButtonBlackOutline = ({ title, disabled, onClick, leftIcon = null, rightIcon = null, variant, size }: Props) => {
    return (
        <Button
            radius="lg"
            px="xl"
            disabled={disabled}
            color='dark'
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            onClick={onClick}
            variant="outline" 
            size= {size}
        >
            {title}
        </Button >
    )
}

