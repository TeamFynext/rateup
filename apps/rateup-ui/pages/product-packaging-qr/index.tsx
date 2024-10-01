import LandingPageLayout from "@/components/HomePage/LandingPageLayout";
import landingPageLayoutStyles from "@/components/HomePage/LandingPageLayout/LandingPageLayout.module.css";
import ProductPackagingQrPage from "@/components/HomePage/pages/ProductPackagingQrPage";

function ProductPackagingQr() {
  return (
    <LandingPageLayout
      className={`${landingPageLayoutStyles["home-page-root"]}`}
    >
      <ProductPackagingQrPage />
    </LandingPageLayout>
  );
}

export default ProductPackagingQr;
