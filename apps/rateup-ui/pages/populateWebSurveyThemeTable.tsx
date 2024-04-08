import { Button } from "@mantine/core";

function PopulateWebSurveyThemeTable() {
  return (
    <Button
      onClick={() => {
        console.log(process.env.NEXT_PUBLIC_FRONTEND_URL);
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/populateSavedThemeTable`, {
          method: "POST",
        })
          .then((response) => {
            return response.json();
          })
          .then((result) => {
            console.log(result);
          });
      }}
    >
      Start
    </Button>
  );
}

export default PopulateWebSurveyThemeTable;
