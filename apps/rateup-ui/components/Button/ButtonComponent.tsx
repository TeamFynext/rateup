import { Button } from '@mantine/core';
interface Props {
    title: string;
    disabled?: boolean
    onClick?: () => void;
    leftIcon?: React.ReactNode;
}

const ButtonComponent = ({ title, disabled, onClick, leftIcon = null }: Props) => {
    return (
        <Button
            disabled={disabled}
            component="a"
            href="#"
            variant="outline"
            leftIcon={leftIcon}
            onClick={onClick}
        >
            {title}
        </Button>
    )
}

export default ButtonComponent