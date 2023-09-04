import {
  Paper,
  Text,Center,
  Stack,
  Button,
  Group,
  TextInput, Radio,
  FileButton,
  Title, Tabs,
  ActionIcon, ColorInput, Textarea, Slider
} from "@mantine/core";
import {
  IconBrandSketch,
  IconLetterCase,
  IconPhotoEdit,
  IconTemplate,
} from "@tabler/icons-react";
import React, {useState, useEffect} from "react";
import Preview from "./Preview";
import { notifications } from "@mantine/notifications";
import { uploadFile } from "../../../utils/file-upload/upload";
import { RateupButtonSecondary } from "../../Button/RateupButtons";
const ShareQR = ({ surveyId }) => {

  const [title, setTitle] = useState('QR Code')
  const [description, setDescription] = useState("Scan QR code for details.")

  const [textSize, setTextSize] = useState(20)
  const [descriptionSize, setDescriptionSize] = useState(14)
  const [logoSize, setLogoSize] = useState(30)

  const [textColor, setTextColor] = useState("#000")
  const [descriptionColor, setDescriptionColor] = useState("#000")
  const [backgroundColor, setBackgroundColor] = useState("skyblue")
  const [qrColor, setQRColor] = useState("#010599FF")
  const [qrBgColor, setQRBgColor] = useState("#FFBF60FF")

  const [file, setFile] = useState<File | null>(null);

  const [isLoadingUpload, setIsLoadingUpload] = useState(false);

  const [logoSrc, setLogoSrc] = useState('');

  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (file) {
        const fileKey = await uploadFile(file);
        const data = { profilePhoto: fileKey };
        if (typeof fileKey === "string") {
          setLogoSrc(data?.profilePhoto)

          notifications.show({
            id: "load-data",
            loading: true,
            title: "Uploading image",
            message: `Hold on, uploading your image in progress`,
            autoClose: false,
            withCloseButton: false,
          });
        }
      }
    };
    uploadAndUpdate();
  }, [file]);

  function removePhoto() {
    setLogoSrc(null)
  }



  return (
    <Paper shadow="sm" mt="xl" p="xl">
      <Title order={4} mb="xl" pb="md">Generate & Share QR Code</Title>

      <Tabs variant="pills" color="gray" defaultValue="text" >

          <Group>

            <Stack justify="flex-start" sx={{ minWidth: "65%"}} mb="xl">

    {/*..... QR Editor Tab titles........ */}
              <Group>

                <Tabs.List>
                  <Tabs.Tab value="text">
                  <Paper shadow="xs" radius="lg"  p="md" sx={{ width: "100px", height: "100px", alignContent: 'center'}}>
                            <Center h="100%">
                                <Stack align="center" spacing="0">
                                  <ActionIcon size="xl">
                                    <IconLetterCase size="2rem" />
                                  </ActionIcon>
                                  <Text align="center">Text</Text>
                              </Stack>
                              </Center>
                          </Paper>
                  
                  </Tabs.Tab>
                  <Tabs.Tab value="background">
                  <Paper shadow="xs" radius="lg" p="md" sx={{ width: "100px", height: "100px", alignContent: 'center'}}>
                            <Center h="100%">
                                <Stack align="center" spacing="0">
                                  <ActionIcon size="xl">
                                    <IconPhotoEdit size="2rem" />
                                  </ActionIcon>
                                  <Text align="center">Style</Text>
                              </Stack>
                              </Center>
                          </Paper>
                  
                  </Tabs.Tab>
                  <Tabs.Tab value="logo">
                    
                  <Paper shadow="xs" radius="lg" p="md" sx={{ width: "100px", height: "100px", alignContent: 'center'}}>
                            <Center h="100%">
                                <Stack align="center" spacing="0">
                                  <ActionIcon size="xl">
                                    <IconBrandSketch size="2rem" />
                                  </ActionIcon>
                                  <Text align="center">Logo</Text>
                              </Stack>
                              </Center>
                          </Paper>
                  
                  </Tabs.Tab>

                  <Tabs.Tab value="template">
                    
                  <Paper shadow="xs" radius="lg"  p="md" sx={{ width: "100px", height: "100px", alignContent: 'center'}}>
                            <Center h="100%">
                                <Stack align="center" spacing="0">
                                  <ActionIcon size="xl">
                                    <IconTemplate  size="2rem" />
                                  </ActionIcon>
                                  <Text align="center">Template</Text>
                              </Stack>
                              </Center>
                          </Paper>
                  </Tabs.Tab>

                </Tabs.List>

              </Group>

    {/*..... QR Editor Tab Panes........ */}

            <Tabs.Panel value="text"  sx={{ minHeight: "350px"}} >
              <Title order={3} mt="xl">  Modify Text </Title>

              <Group>
                <Stack sx={{ minWidth: '40%'}} mr="lg">
                  <TextInput
                    placeholder="Enter Title Here"
                    label="Title"
                    withAsterisk
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Textarea
                    mt="xl"
                    pt="xl"
                    placeholder="Enter description here"
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    withAsterisk
                  />
                </Stack>

                <Stack  sx={{ minWidth: '20%'}} ml="xl">
                  <Stack>
                    <ColorInput placeholder="Select color" label="Text color" value={textColor} onChange={setTextColor} />
                    <Slider value={textSize} onChange={setTextSize}  />
                  </Stack>
                  <Stack pt="xl">
                    <ColorInput placeholder="Select color" label="Description color"  
                              value={descriptionColor} onChange={setDescriptionColor} />

                    <Slider value={descriptionSize} onChange={setDescriptionSize} />
                  </Stack>
                </Stack>

              </Group>
            
            </Tabs.Panel>

            <Tabs.Panel value="background" sx={{ minHeight: "350px"}}>
              
              <Stack>
                <Group>
                   <Title order={3} mt="xl" sx={{minWidth: "200px"}}>  Select Background</Title>
                   
                   <Radio.Group
                    name="background"
                    withAsterisk
                    mt="md"
                    ml="xl"
                    value="Color"
                  >
                    <Group mt="xs">
                      <Radio value="Color" label="Color" />
                      <Radio value="Gradient" label="Gradient" />
                      <Radio value="Image" label="Image" />
                      <Radio value="Transparent" label="Transparent" />
                    </Group>
                  </Radio.Group>

                </Group>
                <Stack  sx={{maxWidth: "300px"}} ml="xl">
                  <ColorInput placeholder="Select color" 
                              value={backgroundColor} onChange={setBackgroundColor} />
                </Stack>
                

                <Group align="center" mt="sm">
                   <Title order={3} mt="xl" sx={{minWidth: "200px"}}>  Select QR color</Title>
                   <Radio.Group
                    name="background"
                    withAsterisk
                    mt="md"
                    ml="xl"
                  >
                    {/* <Group mt="xs">
                      <Radio value="Color" label="Color" />
                      <Radio value="Gradient" label="Gradient" />
                    </Group> */}
                  </Radio.Group>

                </Group>
                <Stack  sx={{maxWidth: "300px"}} ml="xl">
                    <ColorInput placeholder="Select color"  label="QR Color"
                                value={qrColor} onChange={setQRColor} />
                    <ColorInput placeholder="Select color" label="QR Background Color"
                                value={qrBgColor} onChange={setQRBgColor} />
                  </Stack>

              </Stack>
              
              </Tabs.Panel>


            <Tabs.Panel value="logo"  sx={{ minHeight: "350px"}}>
             <Title order={3} mt="xl">  Select a logo</Title>
             <Text>This will appear at the center of the QR code.</Text>

              <Group>
                <Stack sx={{ minWidth: '40%'}} mr="lg" mt="xl">

                <Stack justify="center" sx={{ maxWidth: "200px" }}>
                    <FileButton 
                    onChange={setFile}
                    accept="image/png,image/jpeg">
                      {(props) => <Button fullWidth size="lg" radius="lg"
                        variant="gradient" gradient={{ from: '#62CBE6', to: '#3F5BA9' }}{...props}>Upload Logo</Button>}
                    </FileButton>

                    <RateupButtonSecondary
                      title="Remove Logo"
                      size="sm"
                      onClick={removePhoto}
                    />
                 </Stack>
                  
                </Stack>

                <Stack  sx={{ minWidth: '20%'}} ml="xl">
                  <Stack>
                    <Text>Logo Size</Text>
                    <Slider value={logoSize} onChange={setLogoSize} max={38}  />
                  </Stack>
                  {/* <Stack pt="xl">
                     <Text>Outer margin</Text>
                    <Slider value={descriptionSize} onChange={setDescriptionSize} />
                  </Stack> */}
                </Stack>

              </Group>

            </Tabs.Panel>
            <Tabs.Panel value="template" sx={{ minHeight: "350px"}}>text tab content</Tabs.Panel>

            </Stack>

    {/*..... QR Editor - Preview ........ */}

            <Preview 
              title={title} 
              description={description}
              url = {`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyId}`}
              textSize = {textSize}
              descriptionSize = {descriptionSize}
              logoSize={logoSize}
              textColor = {textColor}
              descriptionColor= { descriptionColor}
              backgroundColor={backgroundColor}
              qrColor={qrColor}
              qrBgColor={qrBgColor}
              logo={logoSrc}
              
              
            />

          </Group>
          </Tabs>


        </Paper>
  )
}

export default ShareQR