import GeneratedQrCard from "../GeneratedQrCard";

function GenerateQrCardsList({ generatedQrs }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {generatedQrs?.map((generatedQr) => (
        <GeneratedQrCard
          key={generatedQr.id}
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
