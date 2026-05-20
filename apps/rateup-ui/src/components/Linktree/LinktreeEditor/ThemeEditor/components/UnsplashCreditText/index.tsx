import styles from "./UnsplashCraditText.module.css";

function UnsplashCreditText({ url }) {
  const params = new URLSearchParams(url?.split("?")[1]);
  const author = params?.get("author");
  const username = params?.get("username");
  const unsplashUserProfileLink = `https://unsplash.com/@${username}?utm_source=Rateup&utm_medium=referral`;
  const unsplashWebsiteLink =
    "https://unsplash.com/?utm_source=Rateup&utm_medium=referral";

  return (
    <>
      {author && (
        <p className={`${styles["credit-text-p"]} credit-text-p`}>
          <span>Photo by </span>
          <a href={unsplashUserProfileLink} target="_blank">
            {author}
          </a>
          <span>{` on `}</span>
          <a href={unsplashWebsiteLink} target="_blank">
            Unsplash
          </a>
        </p>
      )}
    </>
  );
}

export default UnsplashCreditText;
