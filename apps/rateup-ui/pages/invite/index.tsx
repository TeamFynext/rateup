import { Container, Title, Flex , Space, Loader, Text} from '@mantine/core';
import { useRouter } from 'next/router';
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { completeInvite } from '../../backend/team/team.api';
import { notifications } from '@mantine/notifications';
import { IconCheck,  } from '@tabler/icons-react';
import { useEffect } from 'react';
import { RateupButtonPrimary } from '../../components/Button/RateupButtons';
import styles from './styles.module.css';
import { HeaderTabs } from '../../components/Layout/Header/Header';
import { UserMode } from '../../utils/enums';
import { signOut } from "supertokens-auth-react/recipe/session";

const Invite = () => {
const router = useRouter();
const queryClient = useQueryClient()
const { type, token } = router.query;

let title = '';
if(type === 'team')
    title="Team"
else if(type === 'org')
    title="Organization"

const acceptInvite = async () => {
    let inviteToken = token.toString();
    await signOut();
    return completeInvite(inviteToken)
};


const updateInviteMutation = useMutation(() => acceptInvite(), {
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['teamsDetailsQuery'] }),  //update team list on add
            notifications.update({
                id: 'load-data',
                color: 'teal',
                title: 'Success',
                message: 'Invite Accepted successfully.',
                icon: <IconCheck size="1rem" />,
                autoClose: 3000,
            });
    },

    onError: (error: Error) => {
        console.error("Error:", error.message);
        notifications.update({
            id: 'load-data',
            color: 'red',
            title: 'Failed',
            message: error.message,
            icon: <IconCheck size="1rem" />,
            autoClose: 3000,
        });
    },
});

useEffect(() => {
    if (type === 'team' && token) {
        notifications.show({
            id: 'load-data',
            loading: true,
            title: 'Accepting Invite',
            message: `Hold on, while validating your invite.`,
            autoClose: false,
            withCloseButton: false,
        });
        setTimeout(() => {
           !updateInviteMutation.data && updateInviteMutation.mutate()
        }, 2000);

    }
    //TODO : improve with org invite
}, [type, token])


useEffect(() => {
  console.log('====================================');
  console.log(updateInviteMutation.error);
  console.log('====================================');
}, [updateInviteMutation.error])


  return (
    <>
    
            <HeaderTabs mode={UserMode.GUEST} />
            <Space h="lg" />
            <Flex
      gap="md"
      justify="center"
      align="center"
      direction="column"
      wrap="wrap"
    >

        <Space h="xl" />
        <Container>
            <Title color='blue.9'>{title} Invitation</Title>
        </Container>

        {
            (!type || !token)
            ?
        <Container>
            Invite is not valid.
        </Container>  

            :
        <Container>
           
            {
            
            updateInviteMutation.isLoading ||  !updateInviteMutation.data 

            ?

       ( type === 'team'  && token ? <Loader /> : "Error" )
            :
            <Flex      
            gap="md"
            justify="center"
            align="center"
            direction="column"
            wrap="wrap">

                <Text color='green'> {updateInviteMutation.data?.data.message}</Text>
                <div className="wrapper">
            <svg
              className={styles.checkmark}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 52 52"
            >
              <circle
                className={styles.checkmark__circle}
                cx="26"
                cy="26"
                r="25"
                fill="none"
              />
              <path
                className={styles.checkmark__check}
                fill="none"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
          </div>
                <Space h="xl" />

                  
                { updateInviteMutation.data?.data.data.isUser 
                ? "Login to your existing account in this email and continue using the app." 
                : "Your account is ready, Create a new password and login to start using the app." }

           { updateInviteMutation.data?.data.data.isUser ? 
           
           <RateupButtonPrimary
                        onClick={() => {
    router.push('/login');
  }}
                        title={"Continue"}
           />
           : 
           
           <RateupButtonPrimary
                        onClick={() => {
    router.push(updateInviteMutation.data?.data.data.redirectLink);
  }}
                        title={"Continue"}
           />

           }  
            </Flex>

            }
        </Container> 
        }

        { updateInviteMutation.error && "Failed..! Error.... Try another invitation."}
              
      </Flex>

    </>
     
  )
}

export default Invite