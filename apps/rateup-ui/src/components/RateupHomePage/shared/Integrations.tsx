import { useEffect } from "react";

import { imagesPath } from "@/utils/constants";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

const shopify = `${imagesPath}/landing/logos/shopyfy.png`;
const woo = `${imagesPath}/landing/logos/woo.png`;
const petpooja = `${imagesPath}/landing/logos/petlogo.png`;
const zoho = `${imagesPath}/landing/logos/zoho.png`;
const zapier = `${imagesPath}/landing/logos/zapier.png`;

const integrations = [
  {
    name: "Shopify",
    image: shopify,
  },
  {
    name: "WooCommerce",
    image: woo,
  },
  {
    name: "Petpooja",
    image: petpooja,
  },
  {
    name: "Zoho",
    image: zoho,
  },
  {
    name: "Zapier",
    image: zapier,
  },
  {
    name: "REST API",
    isApi: true,
  },
];

export default function Integrations() {
  useEffect(() => {
    const elements = document.querySelectorAll(`.${styles.reveal}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in);
          }
        });
      },
      {
        threshold: 0.15,
      },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.section} id="integrations">
      <div className={styles.page}>
        <div className={styles["sec-head"]}>
          <span className={`${styles.eyebrow} ${styles.reveal}`}>
            <span className={styles.dot} />
            Integrations
          </span>

          <h2 className={styles.reveal} data-d="1">
            Plug RateUp Into <span className={styles["grad-cyan"]}>Your Stack</span>
          </h2>

          <p className={styles.reveal} data-d="2">
            Connect the tools you already run. Sync customers, orders and events both ways — in
            minutes, not weeks.
          </p>
        </div>

        <div className={`${styles.intgGrid} ${styles.reveal}`} data-d="1">
          {integrations.map((intg) => (
            <div key={intg.name} className={styles.intgTile}>
              <span className={styles.intgLogo} style={intg.isApi ? { color: "var(--cyan)" } : {}}>
                {intg.isApi ? (
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1" />
                    <path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" />
                  </svg>
                ) : (
                  <img
                    src={intg.image}
                    alt={intg.name}
                    className="w-14 h-14 object-contain rounded-lg"
                  />
                )}
              </span>

              <span className={styles.intgName}>{intg.name}</span>
            </div>
          ))}
        </div>

        <p className={`${styles.intgFoot} ${styles.reveal}`} data-d="2">
          …and 30+ more via webhooks. <a href="#">Need a custom integration?</a>
        </p>
      </div>
    </section>
  );
}
