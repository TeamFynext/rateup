import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Separator } from "@/components/ui/separator.tsx";

const UserModal = ({ selectedUser }: { selectedUser: UserData }) => {
  const { t: translations } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-around">
        <div className="flex flex-col gap-1 items-center">
          <Avatar className="size-16">
            <AvatarImage
              src={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${selectedUser.profilePhoto}`}
              alt={selectedUser?.userName}
            />
            <AvatarFallback>{selectedUser?.userName?.charAt(0)?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <h4 className="text-lg font-bold">{selectedUser?.userName}</h4>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm w-[110px]">{translations("Email ID")}</span>
            <span className="text-sm text-muted-foreground">{selectedUser?.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm w-[110px]">{translations("User ID")}</span>
            <span className="text-sm text-muted-foreground"> {selectedUser?.userId}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm w-[110px]">{translations("Phone Number")}</span>
            <span className="text-sm text-muted-foreground">{selectedUser?.phone ?? "---"}</span>
          </div>
        </div>
      </div>
      <div className="w-full overflow-auto rounded-lg bg-card p-4 shadow-md">
        <h3 className="text-xl font-bold">{translations("Organization")}</h3>
        <Separator className="my-3" />
        <div className="flex items-center justify-around">
          <div className="flex flex-col gap-1 items-center">
            <Avatar size="lg">
              <AvatarImage
                src={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${selectedUser.orgLogo}`}
                alt={selectedUser?.orgName}
              />
              <AvatarFallback>{selectedUser?.orgName?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <h5 className="text-base font-bold">{selectedUser?.orgName}</h5>
            <span className="text-xs text-muted-foreground">{selectedUser.role}</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm w-[110px]">{translations("Org ID")}</span>
              <span className="text-sm text-muted-foreground">{selectedUser.orgId}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm w-[110px]">
                {translations("Phone Number")}
              </span>
              <span className="text-sm text-muted-foreground">
                {selectedUser.orgPhone ?? "---"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm w-[110px]">{translations("Address")}</span>
              <span className="text-sm text-muted-foreground">
                {selectedUser.orgAddress ?? "---"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
