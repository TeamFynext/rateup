import {
  Center,
  Flex,
  Grid,
  NumberInput,
  TextInput,
  Title,
} from "@mantine/core";
import Button from "../Button";
import styles from "./BookADemoSection.module.css";
import commonStyles from "../../index/index.module.css";
import { useForm } from "@mantine/form";

function BookADemoSection() {
  const form = useForm({
    initialValues: {
      fullName: "",
      email: "",
      phone: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      fullName: (value) =>
        /^[a-zA-Z ]+$/.test(value) ? null : "Invalid full name",
      phone: (value) =>
        /^(\+91[\-\s]?)?[0]?(91)?[789]\d{9}$/.test(value)
          ? null
          : "Invalid phone number",
    },
  });

  return (
    <Flex className={styles["book-a-demo-container"]} direction={"column"}>
      <Title className={commonStyles["gradient-text"]}>Book a Demo</Title>

      <form
        className={styles["form"]}
        onSubmit={form.onSubmit((values) => {
          console.log(values);
        })}
      >
        <Grid className={styles["inputs-conainer"]}>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              classNames={styles}
              withAsterisk
              label="Full Name"
              placeholder="Enter your Full Name"
              {...form.getInputProps("fullName")}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              classNames={styles}
              withAsterisk
              label="Email"
              placeholder="Enter your Email"
              {...form.getInputProps("email")}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              classNames={styles}
              withAsterisk
              label="Phone"
              placeholder="Enter your Phone number"
              {...form.getInputProps("phone")}
            />
          </Grid.Col>
        </Grid>
        <Center>
          <Button type="submit">Book a Demo</Button>
        </Center>
      </form>
    </Flex>
  );
}

export default BookADemoSection;
