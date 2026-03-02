const YoutubeVideo = ({ src }: { src: string }) => {
  return (
    <iframe
      height="400"
      title="youtubevideo"
      width={"80%"}
      style={{
        margin: "auto",
        marginTop: "20px",
        borderRadius: "5px",
        boxShadow: "10px 10px 20px rgba(0, 0, 0, 0.1)",
      }}
      src={src}
      allowFullScreen
    ></iframe>
  );
};

export default YoutubeVideo;
