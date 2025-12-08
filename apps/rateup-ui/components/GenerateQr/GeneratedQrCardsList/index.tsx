import GeneratedQrCard from "../GeneratedQrCard";

function GenerateQrCardsList({ generatedQrs }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
