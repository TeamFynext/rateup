import { ActionIcon } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";

function WhatsappOriginalPreview({ preview }) {
  return (
    <a target="_blank" href={preview?.preview_url}>
      <ActionIcon
        color="blue"
        style={{
          position: "absolute",
          right: "0px",
          top: "20%",
          borderRadius: "100px",
          borderTopRightRadius: "0px",
          borderBottomRightRadius: "0px",
          height: "50px",
          width: "50px",
          zIndex: 2,
        }}
      >
        <IconEye style={{ width: "70%", height: "70%" }} stroke={2} />
      </ActionIcon>
    </a>
  );
}
