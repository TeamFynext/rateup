import { Button, Center, Modal, Select, SimpleGrid, Space, Stack, Text, TextInput, useMantineTheme } from "@mantine/core";
import { useContext, useRef, useState } from "react";
import SelectedTeamContext from "../../context/SelectedTeam";
import { useSurveysByTeam } from "../../backend/surveys/surveys.query";
import { IconDownload } from "@tabler/icons-react";
import { useQRCode } from "next-qrcode";
import { downloadQrCode } from "../../utils/qr";

export function ShareMenuModal({ opened, close, menu }: { opened: boolean, close: () => void, menu: Menu }) {
  const { selectedTeamId } = useContext(SelectedTeamContext)
  const [selectedSurveyId, setSelectedSurveyId] = useState("")
  const { data: res, isLoading, isError } = useSurveysByTeam(selectedTeamId, !!selectedTeamId && opened)
  const surveys = res?.data as Survey[]

  const { Canvas: QRCode } = useQRCode();
  const qrRef = useRef();

  function handleClose() {
    setSelectedSurveyId("")
    close()
  }

  if (isLoading || isError || !surveys || !menu || !opened) {
    return null
  }

  const { colors } = useMantineTheme()

  return (<Modal
    opened={opened}
    onClose={handleClose}
    title="Share Menu"
    centered
    size="auto"
    radius={"lg"}
    padding={"lg"}
  >
    <SimpleGrid cols={2} spacing="md">
      <Stack spacing={"xs"}>
        <Text fz={"2rem"} fw={700} >{menu.name}</Text>
        <Text color={"#3F5BA9"} fw={500} fz={"1.5rem"} >{menu.displayName}</Text>
        <Space h={"xl"} />
        <Select
          label="Select survey"
          placeholder="Select survey to share with"
          data={surveys.map((survey) => ({ value: survey.id, label: survey.title }))}
          value={selectedSurveyId}
          onChange={setSelectedSurveyId}
        />
        <TextInput
          label="Share Link"
          value={!selectedSurveyId ? `Select survey` : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/menu/${menu.id}/feedback/${selectedSurveyId}`}
          onChange={() => { }}
        />

        <Button
          leftIcon={<IconDownload />}
          variant="subtle"
          disabled={!selectedSurveyId}
          onClick={() => {
            downloadQrCode(qrRef, `qr-code-${menu.name}`)
          }}

        >Download QR</Button>
      </Stack>
      <Center
        sx={{
          width: "350px"
        }}
      >
        {!!selectedSurveyId ? (
          <Stack
            ref={qrRef}
            sx={{
              border: "1px solid grey",
              borderRadius: "16px",
              backgroundColor: "white",
              padding: "25px 50px 50px 50px"
            }}
          >
            <Text fz="1.5rem" align="center" lts={"8px"}>
              SCAN QR
            </Text>
            <Center
              sx={{
                backgroundColor: colors.blue[4],
                borderRadius: "16px",
              }}
              p="md"
            >
              {/* TODO: increase resolution when downloading */}
              <QRCode
                text={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/menu/${menu.id}/feedback/${selectedSurveyId}`}
                options={{
                  width: 200,
                  color: {
                    light: colors.blue[4],
                  }
                }}
              />
            </Center>
          </Stack>
        ) : (<Text>{"Select a survey to generate QR"}</Text>)}
      </Center>
    </SimpleGrid>
    <Center mt="md">
      <Button onClick={handleClose} color="dark">
        Close
      </Button>
    </Center>
  </Modal>
  )
}