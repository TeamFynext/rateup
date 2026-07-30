import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { useMediaQuery } from "@/hooks/use-media-query.ts";

export const Route = createFileRoute("/(public-facing)/public/survey/cs/")({
  component: Page,
});

function Page() {
  const largeScreen = useMediaQuery("(min-width: 48em)");
  const [startClicked, setStartClicked] = useState(false);

  return (
    <div className="px-[10vw] py-[5vh] bg-[#F7F6FB] min-h-screen w-full">
      <>
        {/* <Image pb={30}
              src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/logo.svg`} 
              alt="RateUp Logo" width={140} height={35} /> */}

        <img
          className={`pb-[30px] ${largeScreen ? "w-[600px]" : "w-[310px]"}`}
          src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/cs-logo.jpeg`}
          alt="Govt Logo"
        />
      </>
      <div className="p-4 rounded-lg shadow-lg bg-white min-h-[80vh]">
        <div>
          {startClicked ? (
            <StartPage largeScreen={largeScreen} />
          ) : (
            <Welcome largeScreen={largeScreen} setStartClicked={setStartClicked} />
          )}
        </div>
        {/* <RateupRedirectCard /> */}
      </div>
    </div>
  );
}

function Welcome({
  setStartClicked,
  largeScreen,
}: {
  setStartClicked: (clicked: boolean) => void;
  largeScreen: boolean;
}) {
  return (
    <>
      {/* .........Survey Welcome page.......... */}
      <div className="flex flex-col items-center justify-center gap-6 h-[70vh]">
        <h2 className="font-bold text-center" style={{ fontSize: largeScreen ? "4rem" : "3rem" }}>
          Welcome
        </h2>
        <p>Please fill the survey..</p>
        <Button
          size="lg"
          onClick={() => {
            setStartClicked(true);
          }}
        >
          Start Survey
        </Button>
      </div>
    </>
  );
}

const survey1 =
  "https://www.rateup.app/public/survey/06f95c13-fc22-438f-a7dd-f4f068ac4233?start=true";
const survey2 =
  "https://www.rateup.app/public/survey/24f3cdde-4833-46f6-9b82-6ded85e679f8?start=true";
const survey3 =
  "https://www.rateup.app/public/survey/74a86d7e-ec59-40e3-8bf5-4dbece9023e2?start=true";

function StartPage({ largeScreen }: { largeScreen: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 h-[70vh]">
      <h3
        className="font-bold text-center mb-6 pb-2"
        style={{ fontSize: largeScreen ? "3rem" : "1.5rem" }}
      >
        Select one option :
      </h3>

      <Link to={`${survey1}`}>
        <Button variant="outline" size={largeScreen ? "lg" : "sm"}>
          I Have Ration Card & Aadhaar Card
        </Button>
      </Link>

      <Link to={`${survey2}`}>
        <Button variant="outline" size={largeScreen ? "lg" : "sm"}>
          I have Aadhaar only [No Ration Card]
        </Button>
      </Link>

      <Link to={`${survey3}`}>
        <Button variant="outline" size={largeScreen ? "lg" : "sm"}>
          I have No Aadhaar & Ration Card
        </Button>
      </Link>
    </div>
  );
}
