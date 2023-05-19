import { Button } from '@mantine/core';
interface Props {
    title: string;
    disabled?: boolean
    onClick?: () => void;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    variant?: string;
}

const ButtonComponent = ({ title, disabled, onClick, leftIcon = null, rightIcon = null, variant }: Props) => {
    return (
        <Button
            radius="lg"
            px="xl"
            py="sm"
            style={{
                color: "black",
            }}
            disabled={disabled}
            color='yellow'
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            onClick={onClick}
            variant={variant}
        >
            {title}
        </Button >
    )
}

export default ButtonComponent