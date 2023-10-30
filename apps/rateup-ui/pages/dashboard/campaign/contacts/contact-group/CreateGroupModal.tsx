import {
  Paper,
  Stack,
  Center,
  Text,
  Box,
  SimpleGrid,
  TextInput,
  Button,
  FileButton,
  Group,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconUpload, IconUsersGroup } from "@tabler/icons-react";
import FormModalLayout from "../../../../../components/Modal/FormModalLayout";
import { useForm } from "@mantine/form";
import { TeamSelector } from "../../../../../components/input/TeamSelector";
import { useEffect, useState } from "react";
import {
  RateupButtonSecondary,
  RateupButtonBlue,
} from "../../../../../components/Button/RateupButtons";

const CreateGroupModal = ({ groupClose }) => {
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const form = useForm({});
  useEffect(() => {
    close();
  }, []);
  return (
    <Box>
      <form>
        <SimpleGrid cols={2}>
          <TextInput
            label="Group Name"
            placeholder="Enter group name"
            {...form.getInputProps("groupName")}
            size="md"
            radius={"md"}
          ></TextInput>
          <Stack gap={0}>
            <Text>Select Team</Text>
            <TeamSelector
              value={selectedTeamID}
              onChange={setSelectedTeamID}
            ></TeamSelector>
          </Stack>
          <Stack gap={0}>
            <Text>Upload profile picture</Text>
            <FileButton onChange={setFile} accept="image/png,image/jpeg">
              {(props) => (
                <Button
                  size="xl"
                  radius="lg"
                  {...props}
                  variant="outline"
                  color="grey"
                  leftSection={<IconUpload size={15}></IconUpload>}
                >
                  <Text size="sm">Upload Icon</Text>
                </Button>
              )}
            </FileButton>
          </Stack>
        </SimpleGrid>
        <Group justify="flex-end">
          <RateupButtonSecondary
            title="cancel"
            onClick={groupClose}
          ></RateupButtonSecondary>
          <RateupButtonBlue
            title="Create Group"
            type="submit"
          ></RateupButtonBlue>
        </Group>
      </form>
    </Box>
  );
};

export default CreateGroupModal;
