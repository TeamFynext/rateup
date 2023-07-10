import { useRouter } from "next/router";

export default function Settings(){

    const router = useRouter();
    router.push("/dashboard/settings/account")

    return (
        <>
            <h2>Settings</h2>
        </>
    );

}