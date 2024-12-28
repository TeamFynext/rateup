import { useUpdateRedeem } from "@/backend/loyalty/redeems/redeems.query"
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput"
import FormModalLayout from "@/components/Modal/FormModalLayout"
import { RedeemStatus } from "@/pages/dashboard/loyalty/redeem"
import { useForm } from "@mantine/form"
import { useEffect } from "react"

const UpdateRedeemStatusModal = ({ opened, close, redeem }) => {
    const updateRedeemMut = useUpdateRedeem()
    
    const form = useForm({
      initialValues: {
       status: ""
      }
    })
  
    const handleUpdateStatus = () => {
      if(form.validate().hasErrors) return
      updateRedeemMut.mutate({ redeemId: redeem.id, data: form.values }, {
        onSettled: () => {
          form.reset();
          close()
        }
      })
    }
 
    useEffect(() => {
      form.setInitialValues({ status: redeem?.status})
      form.setValues({ status: redeem?.status})
    },[redeem])
    
    return (
       <FormModalLayout opened={opened} onClose={() => { form.reset(); close(); }}title=""
        onSubmit={handleUpdateStatus}
        isLoading={updateRedeemMut.isPending}
        centered
        buttonTitle="Update"
       >
         <ContainedSelection label="Status" data={Object.values(RedeemStatus)} {...form.getInputProps("status")}/>
       </FormModalLayout>
    )
}

export default UpdateRedeemStatusModal