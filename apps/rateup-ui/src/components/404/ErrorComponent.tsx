import type { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";

import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { Button } from "../ui/button.tsx";
import { Spinner } from "../ui/spinner.tsx";

interface ErrorComponentProps {
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<any, Error>>;
  isRefetching?: boolean;
}
const ErrorComponent = ({ refetch, isRefetching }: ErrorComponentProps) => {
  return (
    <div className="grid h-full flex-1 place-content-center px-4">
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
        <img
          src={getFileUrlFromKey("/images/error-img.svg", false)}
          alt="Error Image"
          className="h-[220px] w-[300px]"
        />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Uh-oh!</h1>
        <p className="text-muted-foreground">Something Went Wrong.</p>
        <div className="mt-2.5">
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching && <Spinner />}
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorComponent;
