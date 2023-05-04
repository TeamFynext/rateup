import { Button } from '@mantine/core';
import { IconSquarePlus } from '@tabler/icons';


interface Props {
    title: string;
    disabled?: boolean
}

const ButtonComponent = ({ title, disabled }: Props) => {
    return (
        <Button disabled={disabled} component="a" href="#" variant="outline" leftIcon={<IconSquarePlus size="1rem" />}>
            {title}
        </Button>
    )
}

export default ButtonComponent