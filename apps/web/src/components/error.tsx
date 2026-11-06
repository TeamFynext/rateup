import type { ErrorComponentProps } from "@tanstack/react-router";

import CommonError from "@/components/404/common-error.tsx";

const ErrorPage = (props: ErrorComponentProps) => {
  return <CommonError {...props} className={"h-screen"} />;
};

export default ErrorPage;
