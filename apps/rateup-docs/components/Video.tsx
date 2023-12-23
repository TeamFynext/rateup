
const Video = ({ src }) => {
  return (
    <video
    muted
    autoPlay
    playsInline
    loop
    controls
    width={"80%"}
    style={{margin:"auto",marginTop:"20px", borderRadius:"5px"}}
  >
    <source src={src} type="video/mp4" />
  </video>
  )
}

export default Video