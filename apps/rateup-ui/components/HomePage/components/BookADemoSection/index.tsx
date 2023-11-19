import { Center, Flex, TextInput, Title } from "@mantine/core";
import Button from "../Button";
import styles from "./BookADemoSection.module.css";
import commonStyles from "../../index/index.module.css";
import { useForm } from "@mantine/form";

function BookADemoSection() {
  const form = useForm({
    initialValues: {
      fullName: "",
      email: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      fullName: (value) =>
        /^[a-zA-Z ]+$/.test(value) ? null : "Invalid full name",
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
        <Flex className={styles["inputs-conainer"]}>
          <TextInput
            classNames={styles}
            withAsterisk
            label="Full Name"
            placeholder="Enter your Full Name"
            {...form.getInputProps("fullName")}
          />

          <TextInput
            classNames={styles}
            withAsterisk
            label="Email"
            placeholder="Enter your Email"
            {...form.getInputProps("email")}
          />
        </Flex>
        <Center>
          <Button type="submit">Book a Demo</Button>
        </Center>
      </form>
    </Flex>
  );
}

export default BookADemoSection;
