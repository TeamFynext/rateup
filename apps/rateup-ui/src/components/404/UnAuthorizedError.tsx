import { IconUserShield } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button.tsx";

function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center gap-6 pt-[200px]">
      <div className="flex items-center gap-2">
        <IconUserShield size={32} stroke={2} />
        <h3 className="text-2xl font-semibold text-foreground">Access Denied</h3>
      </div>
      <p className="max-w-2xl text-center text-lg text-muted-foreground">
        You don&apos;t have permission to access this page. Please contact your super admin if you
        believe this is an error, or return to the homepage.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="default"
          onClick={() =>
            navigate({
              to: "/dashboard",
            })
          }
        >
          Go back to home page
        </Button>
        <Button
          size="default"
          variant="ghost"
          onClick={() =>
            navigate({
              to: "/logout",
            })
          }
        >
          Sign in with a different account
        </Button>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
