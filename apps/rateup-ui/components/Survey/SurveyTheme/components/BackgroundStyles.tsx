import {
  Box,
  Group,
  Loader,
  Select,
  Stack,
  Tabs,
  Title,
  Space,
  Paper,
  Flex,
  Text,
  TextInput,
  Card,
  ColorPicker,
  Radio,
  FileInput,
  Button,
  FileButton,
} from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import React, { useState, useRef, useEffect } from "react";
import { uploadFile } from "../../../../utils/file-upload/upload";

function BackgroundStyles({ saveStyles, currentStyles, setCurrentstyles }) {
  const fileInputRef = useRef(null);

  const [backgroundStyles, setbackgroundStyles] = useState({
    name: "background",
    bgType: "bgcolor",
    bgStyles: currentStyles.bgStyles,
    bgUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/sample.png`,
    borderRadius: 18,
  });

  const [isFileLoading, setisFileLoading] = useState(false);
  useEffect(() => {
    setCurrentstyles({ ...currentStyles, bgStyles: backgroundStyles.bgStyles });
  }, [backgroundStyles]);

  //----------onsubmit form -------------
  const onSubmit = (e) => {
    e.preventDefault();

    saveStyles(backgroundStyles);
  };

  const handleChange = (newValue) => {
    setCurrentstyles({ ...currentStyles, bgType: newValue });
  };
  const handleOpenFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (value) => {
    setisFileLoading(true);
    const fileKey = await uploadFile(value);
    if (typeof fileKey === "string") {
      setisFileLoading(false);
      setCurrentstyles({ ...currentStyles, bgUrl: fileKey });
      setbackgroundStyles({
        ...backgroundStyles,
        bgStyles: {
          ...backgroundStyles.bgStyles,
          bgUrl: fileKey,
        },
      });
    }
  };
  return (
    <Stack>
      <Stack mt={10}>
        <Radio.Group value={currentStyles.bgType} onChange={handleChange}>
          <Flex gap={10} align={"center"}>
            <Radio value="bgcolor" color="dark" />
            <span style={{ fontSize: "14px", fontWeight: 500, color: "black" }}>
              Background color
            </span>
          </Flex>
          <ColorPicker
            format="rgba"
            size="md"
            value={backgroundStyles?.bgStyles?.backgroundColor}
            onChange={(value) =>
              setbackgroundStyles({
                ...backgroundStyles,
                bgStyles: {
                  ...backgroundStyles.bgStyles,
                  backgroundColor: value,
                },
              })
            }
            mt={10}
          />
          <Text>{backgroundStyles?.bgStyles?.backgroundColor}</Text>
          <Flex gap={10} align={"center"} mt={20}>
            <Radio value="bgimage" color="dark" />
            <span style={{ fontSize: "14px", fontWeight: 500, color: "black" }}>
              Background image
            </span>
          </Flex>
          <FileInput
            ref={fileInputRef}
            mt={10}
            display={"none"}
            accept="image/*"
            placeholder="Choose background image"
            icon={<IconUpload size={14} />}
            onChange={handleFileChange}
          />

         
        </Radio.Group>

        <FileButton onChange={handleFileChange} accept="image/png,image/jpeg">
          {(props) => (
            <Button
            leftIcon={<IconUpload size={16} />}
              fullWidth
              size="md"
              radius="18px"
              h={50}
              style={{border:"1px solid #D3D3D3"}}
              variant="white"
              color="dark"
              // w={"lg"}
              // p={20}
              // gradient={{ from: "#62CBE6", to: "#3F5BA9" }}
              {...props}
              loading={isFileLoading}
            >
              Uplaod image
            </Button>
          )}
        </FileButton>
        <Flex justify={"center"}>
          <Button
            bg="black"
            radius={48}
            size={"sm"}
            pl={40}
            pr={40}
            mt={20}
            onClick={onSubmit}
          >
            {" "}
            Save
          </Button>
        </Flex>
      </Stack>
    </Stack>
  );
}

export default BackgroundStyles;
