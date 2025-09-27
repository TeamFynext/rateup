import Image from "next/image";


const Footer = () => {
  return (
    <footer style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap", 
      width:"100%"
    }}>
      <p>
        Powered by <Image src={"/images/rateup-logo.svg"} width={50} height={50} alt="rateup logo" />
      </p>
      <p style={{ marginLeft: "auto" }}>Copyright © {new Date().getFullYear()} RateUp Docs, Inc.</p>
    </footer>
  )
}
const config = {
    // darkMode: false,
    head: (
      <>
        <title>RateUp Documentation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:title" content="RateUp Documentation" />
        <meta
          property="og:description"
          content="Welcome to the RateUp documentation"
        />
        <link rel="icon" href="/favicon.png" />
      </>
    ),
    footer: {
      text:Footer
    },
    logo: (
        <>
        <Image src={"/images/rateup-logo.svg"} width={50} height={50} alt="rateup logo"/>
        <span>Rate Up Documentation</span>
        </>
    ),
    project: {
      icon: <Image src={"/images/rateup-star.svg"} width={30} height={30} alt="rateup logo"/>,
      link: 'https://rateup.app'
    },
    sidebar: {
      autoCollapse: true,
      defaultMenuCollapseLevel: 1,
    },
    feedback: {
      content: (
          <div>
            Feedback
          </div>
      ),
      useLink: () => "https://rateup.app"
    },
    editLink: {
      text:null,

    },
 
  
    // ... other theme options
  }
  export default config