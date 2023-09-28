import { Button, ButtonProps } from '@mantine/core';
import { GoogleIcon } from '../../public/images/icons/GoogleIcon';

export function GoogleButton(props: ButtonProps) {
    return <Button leftSection={<GoogleIcon />} variant="default" color="gray" {...props} />;
}
