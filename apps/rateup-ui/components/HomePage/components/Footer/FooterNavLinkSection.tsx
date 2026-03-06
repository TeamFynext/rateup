import Link from "next/link";

import styles from "./footer.module.css";

function FooterNavLinkSection({ heading, linksArray }) {
  return (
    <div className={styles["footer-nav-section"]}>
      <h1>{heading}</h1>
      <div className={styles["footer-nav-section-links-container"]}>
        {linksArray.map(({ href, linkText }) => {
          return (
            <Link key={linkText} href={href}>
              {linkText}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default FooterNavLinkSection;
