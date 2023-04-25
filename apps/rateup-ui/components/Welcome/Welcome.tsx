import {Title, Text, Anchor} from '@mantine/core';
import useStyles from './Welcome.styles';

export function Welcome() {
    const {classes} = useStyles();

    return (
        <>
            <Title className={classes.title} align="center" mt={100}>
                Welcome to{' '}
                <Text inherit variant="gradient" component="span">
                    Rateup
                </Text>
            </Title>
            <Text color="dimmed" align="center" size="lg" sx={{maxWidth: 580}} mx="auto" mt="xl">
                RateUp is a customer feedback analysis and management platform that helps businesses collect and analyze
                customer feedback to improve their products and services. It allows them to send surveys, categorize and
                prioritize feedback, and respond to customers directly through the platform. RateUp uses machine
                learning algorithms to identify trends and themes in customer feedback, and generate insights and
                reports for businesses to take action on. It also integrates with popular CRMs, such as Salesforce and
                HubSpot, to make feedback management more seamless. With RateUp, businesses can better understand their
                customers' needs and preferences, and make data-driven decisions to enhance customer satisfaction and
                loyalty. Overall, RateUp is a valuable tool for businesses that strive to stay customer-focused and
                continuously improve their offerings.
            </Text>
        </>
    );
}

Welcome.getLayout = function PageLayout(page) {
    return (
        <>
            {page}
        </>
    )
}
