import { Text } from "@mantine/core";
import { useEffect } from "react";
import { useSyncTemplatesMutation } from "../../../../backend/whatsapp/whatsapp.query";
import { useRouter } from "next/router";

export default function () {
  const router = useRouter()
  const syncTemplatesMutation = useSyncTemplatesMutation(
    () => {
      router.push(`/dashboard/promotion/templates`)
    }
  )
  useEffect(() => {
    syncTemplatesMutation.mutate()
  }, [])
  return (
    <Text>Syncing...</Text>
  )
}