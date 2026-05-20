import styles from "./QuestionReviewPageEditor.module.css";

const reviewPageLogosObj = {
  Google: (
    <img
      className={styles["logo-img"]}
      src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/websurvey/review-page/logos/google.png`}
      alt="Google logo"
    />
  ),
  Amazon: (
    <img
      className={styles["logo-img"]}
      src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/websurvey/review-page/logos/amazon.png`}
      alt="Amazon"
    />
  ),
  Facebook: (
    <img
      className={styles["logo-img"]}
      src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/websurvey/review-page/logos/facebook.png`}
      alt="Facebook"
    />
  ),
  Instagram: (
    <img
      className={styles["logo-img"]}
      src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/websurvey/review-page/logos/instagram.png`}
      alt="Instagram"
    />
  ),
  MakeMyTrip: (
    <img
      className={styles["logo-img"]}
      src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/websurvey/review-page/logos/makemytrip.png`}
      alt="MakeMyTrip"
    />
  ),
  Tripadvisor: (
    <img
      className={styles["logo-img"]}
      src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/websurvey/review-page/logos/tripadvisor.png`}
      alt="Tripadvisor"
    />
  ),
  Yelp: (
    <img
      className={styles["logo-img"]}
      src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/websurvey/review-page/logos/yelp.png`}
      alt="Yelp"
    />
  ),
};

export { reviewPageLogosObj };
