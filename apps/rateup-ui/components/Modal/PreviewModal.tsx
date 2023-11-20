import { Image, Modal, Stack } from "@mantine/core";
import { RateupButtonBlue } from "../Button/RateupButtons";

interface ConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  headerTitle: string;
  imgObject: string;
}
export default function PreviewModal({
  opened,
  onClose,
  headerTitle,
  imgObject,
}: ConfirmationModalProps) {
  return (
    <Modal
      centered
      title={headerTitle}
      opened={opened}
      onClose={onClose}
      radius={"lg"}
      styles={{
        title: {
          fontSize: 20,
          fontWeight: "bolder",
        },
      }}
    >
      <Modal.Body>
        <Stack>
          <Image
            radius={"lg"}
            src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${imgObject}`}
          />
          <RateupButtonBlue title={"Close"} onClick={onClose} />
        </Stack>
      </Modal.Body>
    </Modal>
  );
}
