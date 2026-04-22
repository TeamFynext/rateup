import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";

const CustomAlertDialog = ({
  title,
  description,
  buttonTitle,
  onAction,
  onCancel,
  buttonColor = "",
  opened,
  setOpened,
}: {
  title: string;
  description: string;
  buttonTitle: string;
  onAction: () => void;
  onCancel?: () => void;
  buttonColor?: string;
  opened: boolean;
  setOpened: (value) => void;
}) => {
  return (
    <AlertDialog open={opened} onOpenChange={setOpened}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(e) => {
              e.stopPropagation();
              if (onCancel) {
                onCancel();
              }
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className={`text-sm ${buttonColor} font-normal`}
          >
            {buttonTitle || "Continue"}{" "}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CustomAlertDialog;
