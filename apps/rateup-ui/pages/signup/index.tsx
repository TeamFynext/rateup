import { useDisclosure } from "@mantine/hooks";
import AuthForm from "../../components/Form/AuthForm";
import { useCheckSession } from "../../hooks/checkSession";
import { AuthMode } from "../../utils/enums";
import { LoadingOverlay} from '@mantine/core';
import { useRouter } from 'next/router';

const Signup = () => {
   const router = useRouter();
   const { auth } = router.query;
   if(!auth)
   {
    const isLoading = useCheckSession();
    const [visible, { toggle }] = useDisclosure(false);
 
     return (
       <>
         {isLoading ? <LoadingOverlay visible={visible} style={{ textAlign:'center' }} /> : <AuthForm mode={AuthMode.SIGNUP} />}
       </>
     );
   }else{
    return (
      <>
         <AuthForm mode={AuthMode.SIGNUP} authType={auth} />
      </>
    );
   }

};

export default Signup;
