
interface ScreenshotProps {
  src: string;
  alt?: string;
  width?: string | number,
  height?: string | number

}

const Screenshot = ( { src, alt, width = "80%", height= "auto" } : ScreenshotProps) => {
  return (
      <img src={src} alt={alt} width={width} height={height} style={{margin:"auto", marginTop:"20px"}}/>
  )
}

export default Screenshot