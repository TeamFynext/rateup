import CommonError from "@/components/404/common-error.tsx";

const ErrorPage = (props: { error?: Error; reset?: () => void }) => {
  return <CommonError {...props} className={"h-screen"} />;
};

export default ErrorPage;
