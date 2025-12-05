import GeneratedQrCard from "../GeneratedQrCard";

function GenerateQrCardsList({ generatedQrs }) {
  return (
    <div>
      {generatedQrs?.map((generatedQr) => (
        <GeneratedQrCard
          id={generatedQr.id}
          shortUrlId={generatedQr.shortUrlId}
          isPublished={generatedQr.isPublished}
          createdAt={generatedQr.createdAt}
          scans={generatedQr.noOfScans}
          name={generatedQr.name}
        />
      ))}
    </div>
  );
}

export default GenerateQrCardsList;
