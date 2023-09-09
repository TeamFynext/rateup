import React from 'react'
import { useRouter } from "next/router";

const index = () => {
  const router = useRouter();
  router.push('/dashboard/surveys');
  return (
    <>Results</>
  )
}

export default index