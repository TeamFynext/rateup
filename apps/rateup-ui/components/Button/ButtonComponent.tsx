import { Button } from '@mantine/core';
import { IconSquarePlus } from '@tabler/icons';


interface Props {
    title: string;
}

const ButtonComponent = ({ title }: Props) => {
    return (
        <Button component="a" href="#" variant="outline" leftIcon={<IconSquarePlus size="1rem" />}>
            {title}
        </Button>
    )
}

export default ButtonComponent