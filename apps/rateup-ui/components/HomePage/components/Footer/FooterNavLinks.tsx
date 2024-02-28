import { footerNavLinks } from "../../constants";
import styles from "./footer.module.css";
import FooterNavLinkSection from "./FooterNavLinkSection";

function FooterNavLinks() {
  return (
    <div className={styles["footer-nav-links-container"]}>
      {Object.keys(footerNavLinks).map((key) => {
        const sectionObj = footerNavLinks[key];
        return <FooterNavLinkSection key={key} {...sectionObj} />;
      })}
    </div>
  );
}

export default FooterNavLinks;
