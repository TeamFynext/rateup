import React, { useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";
import { Modal, Group, Button,Flex,Text, Stack,createStyles, Image } from "@mantine/core";
import { IconTrash, IconX } from "@tabler/icons-react";

const useStyles = createStyles((theme) => ({
cancelButton:{
  borderRadius:4,
  background:"#9C9C9C",
  color:"#000",
  fontWeight:500,

},
okButton:{
  borderRadius:4,
  background:"#1C518E",
  color:"#fff",
  fontWeight:500,

},
}))
export function DeleteLandingPageConfirmation({showModal,confirmDelete}) {

  const {classes, theme} = useStyles();
 
  const [opened, { open, close }] = useDisclosure(false);
  useEffect(() => {
    if (showModal) {
      open();
    }else{
      close()
    }
  }, [showModal]);

  

  return (
    <Modal opened={opened} onClose={close} withCloseButton={false} padding={40} radius={18}>
      <Stack w={"100%"} justify="center" ta={"center"} align="center">
       
       <IconTrash size="4rem" />
        <Text fw={500 } mt={0}> Are you sure you want to delete?</Text>
        <Flex justify={"center"} gap={20}>
          <Button className={classes.cancelButton} w={90}  onClick={close}>Cancel</Button>
          <Button className={classes.okButton} w={90}  onClick={()=>confirmDelete(true)}>Ok</Button>
        </Flex>
      </Stack>
    </Modal>
  );
}
