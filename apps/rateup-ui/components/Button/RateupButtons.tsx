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
}

export const RateupButtonPrimary = ({ type, title, disabled, onClick, leftIcon = null, rightIcon = null, variant, size }: Props) => {
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
            variant={variant}
            size= {size}
            type={type}
        >
            {title}
        </Button >
    )
}

export const RateupButtonSecondary = ({ title, disabled, onClick, leftIcon = null, rightIcon = null, variant, size }: Props) => {
    return (
        <Button
            radius="lg"
            px="xl"
            disabled={disabled}
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            onClick={onClick}
            color="dark"
            size= {size}
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

