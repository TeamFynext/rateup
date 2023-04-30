import { Container } from '@mantine/core';
import { HomeNavbar } from './Navbar';
import useStyles from './HomePage.styles';

export function HomePage() {
    const { classes } = useStyles();
    return (
        <Container>
            <HomeNavbar />
            <div className={classes.inner} />
        </Container>
    );
}
