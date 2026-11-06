const Video = ({ src }: { src: string }) => {
  return (
    <video
      muted
      autoPlay
      playsInline
      loop
      controls
      width={"80%"}
      style={{
        margin: "auto",
        marginTop: "20px",
        borderRadius: "5px",
        boxShadow: "10px 10px 20px rgba(0, 0, 0, 0.1)",
      }}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
};

export default Video;
