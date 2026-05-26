function NewsletterSubscription() {
  return (
    <section className="py-12 md:py-16">
      <link
        rel="stylesheet"
        href="https://sibforms.com/forms/end-form/build/sib-styles.css"
      />
      <style>{`
        .rateup-newsletter {
          --newsletter-blue: #0e2280;
          --newsletter-green: #25d366;
          --newsletter-accent: #f5a623;
          --newsletter-light-blue: #82cbff;
          --newsletter-text-muted: rgba(255, 255, 255, 0.6);
          --newsletter-text-hint: rgba(255, 255, 255, 0.35);
          --newsletter-card-bg: rgba(255, 255, 255, 0.1);
          --newsletter-border: rgba(255, 255, 255, 0.22);
        }

        .rateup-newsletter * {
          box-sizing: border-box;
        }

        .rateup-newsletter .sub-card {
          width: 100%;
          max-width: 660px;
          margin: 0 auto;
          border-radius: 22px;
          background: var(--newsletter-blue);
          position: relative;
          overflow: hidden;
          padding: 44px 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif;
        }

        .rateup-newsletter .blob {
          position: absolute;
          border-radius: 50%;
        }

        .rateup-newsletter .blob-1 {
          width: 110px;
          height: 110px;
          background: #fff;
          top: -28px;
          left: -28px;
          opacity: 0.1;
        }

        .rateup-newsletter .blob-2 {
          width: 75px;
          height: 75px;
          background: #fff;
          top: -10px;
          left: 40px;
          opacity: 0.07;
        }

        .rateup-newsletter .blob-3 {
          width: 130px;
          height: 130px;
          background: var(--newsletter-accent);
          top: -40px;
          right: -30px;
          opacity: 0.55;
        }

        .rateup-newsletter .blob-4 {
          width: 80px;
          height: 80px;
          background: #1a52e8;
          bottom: -20px;
          right: 30px;
          opacity: 0.6;
        }

        .rateup-newsletter .blob-5 {
          width: 55px;
          height: 55px;
          background: var(--newsletter-accent);
          bottom: -10px;
          left: -10px;
          opacity: 0.55;
        }

        .rateup-newsletter .blob-6 {
          width: 95px;
          height: 95px;
          background: #fff;
          bottom: -30px;
          left: 30px;
          opacity: 0.08;
        }

        .rateup-newsletter .accent-ring {
          position: absolute;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 30px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          z-index: 1;
        }

        .rateup-newsletter .accent-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--newsletter-green);
          box-shadow: 0 0 6px var(--newsletter-green);
        }

        .rateup-newsletter .sub-title {
          font-size: 24px;
          font-weight: 900;
          color: #fff;
          text-align: center;
          line-height: 1.25;
          letter-spacing: -0.3px;
          position: relative;
          z-index: 1;
          margin-top: 12px;
        }

        .rateup-newsletter .sub-title em {
          color: var(--newsletter-light-blue);
          font-style: normal;
        }

        .rateup-newsletter .sub-sub {
          font-size: 13px;
          color: var(--newsletter-text-muted);
          text-align: center;
          position: relative;
          z-index: 1;
          margin-top: -10px;
          line-height: 1.6;
        }

        .rateup-newsletter .field-group {
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          position: relative;
          z-index: 1;
        }

        .rateup-newsletter .field-group .entry__label,
        .rateup-newsletter .field-group label[for='EMAIL'] {
          font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          color: rgba(255, 255, 255, 0.75) !important;
          letter-spacing: 0.06em !important;
          text-transform: uppercase !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          margin-bottom: 0 !important;
        }

        .rateup-newsletter .field-group .entry__field {
          margin-top: 0 !important;
          width: 100%;
        }

        .rateup-newsletter .field-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          background: var(--newsletter-card-bg);
          border: 1.5px solid var(--newsletter-border);
          border-radius: 14px;
          padding: 5px;
          gap: 6px;
          transition: border-color 0.2s, background 0.2s;
        }

        .rateup-newsletter .field-row:focus-within {
          border-color: rgba(130, 203, 255, 0.6);
          background: rgba(255, 255, 255, 0.14);
        }

        .rateup-newsletter .field-row #EMAIL {
          width: 100%;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif !important;
          font-size: 14px !important;
          color: #fff !important;
          padding: 10px 12px !important;
          min-width: 0;
          border-radius: 0 !important;
        }

        .rateup-newsletter .field-row #EMAIL::placeholder {
          color: rgba(255, 255, 255, 0.35) !important;
          font-size: 13.5px !important;
        }

        .rateup-newsletter .sib-form-block__button {
          background: var(--newsletter-green) !important;
          color: #f0fff6 !important;
          font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          border: none !important;
          border-radius: 10px !important;
          padding: 11px 22px !important;
          cursor: pointer !important;
          white-space: nowrap !important;
          transition: background 0.2s, transform 0.15s !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 7px !important;
          letter-spacing: 0.01em !important;
          min-height: 42px;
          min-width: 132px;
          text-transform: none !important;
        }

        .rateup-newsletter .sib-form-block__button:hover {
          background: #1ebd5a !important;
          transform: scale(1.02);
        }

        .rateup-newsletter .sib-form-block__button:active {
          transform: scale(0.98);
        }

        .rateup-newsletter .field-hint {
          font-size: 11px;
          color: var(--newsletter-text-hint);
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .rateup-newsletter #error-message {
          background: rgba(255, 80, 80, 0.15) !important;
          border-color: rgba(255, 80, 80, 0.4) !important;
          color: #ffb3b3 !important;
          border-radius: 10px !important;
          font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif !important;
          font-size: 13px !important;
          max-width: 480px !important;
          width: 100% !important;
        }

        .rateup-newsletter #success-message {
          background: rgba(37, 211, 102, 0.18) !important;
          border-color: rgba(37, 211, 102, 0.4) !important;
          color: var(--newsletter-green) !important;
          border-radius: 10px !important;
          font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif !important;
          font-size: 13px !important;
          max-width: 480px !important;
          width: 100% !important;
        }

        .rateup-newsletter #sib-form-container {
          background: transparent !important;
        }

        .rateup-newsletter #sib-container {
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          max-width: 100% !important;
          padding: 0 !important;
        }

        .rateup-newsletter .sib-form {
          background: transparent !important;
          padding: 0 !important;
        }

        .rateup-newsletter .sib-form-block {
          padding: 0 !important;
          background: transparent !important;
        }

        .rateup-newsletter .form__entry {
          margin: 0 !important;
        }

        .rateup-newsletter .sib-form-block:first-child p,
        .rateup-newsletter .sib-text-form-block,
        .rateup-newsletter .entry__specification {
          display: none !important;
        }

        .rateup-newsletter .entry__error {
          font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif !important;
          font-size: 11px !important;
          color: #ffb3b3 !important;
          background: transparent !important;
          border: none !important;
          padding: 2px 0 0 !important;
        }

        @media (max-width: 560px) {
          .rateup-newsletter .sub-card {
            padding: 40px 24px;
          }

          .rateup-newsletter .sub-title {
            font-size: 20px;
          }

          .rateup-newsletter .field-row {
            grid-template-columns: 1fr;
            border-radius: 12px;
          }

          .rateup-newsletter .sib-form-block__button {
            width: 100% !important;
            justify-content: center !important;
          }

          .rateup-newsletter .sub-sub br {
            display: none;
          }
        }
      `}</style>

      <div className="rateup-newsletter">
        <div className="sub-card">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
          <div className="blob blob-5" />
          <div className="blob blob-6" />

          <div className="accent-ring">
            <span className="accent-dot" />
            Weekly insights - free
          </div>

          <div className="sub-title">
            Stay ahead with <em>RateUp</em>
            <br />
            WhatsApp &amp; AI updates
          </div>

          <div className="sub-sub">
            Get the latest on customer engagement, loyalty strategies
            <br />
            and WhatsApp automation - straight to your inbox.
          </div>

          <div
            className="sib-form"
            style={{
              background: "transparent",
              padding: 0,
              width: "100%",
              maxWidth: "480px",
            }}
          >
            <div id="sib-form-container" className="sib-form-container">
              <div id="error-message" className="sib-form-message-panel">
                <div className="sib-form-message-panel__text sib-form-message-panel__text--center">
                  <svg
                    viewBox="0 0 512 512"
                    className="sib-icon sib-notification__icon"
                  >
                    <path d="M256 40c118.621 0 216 96.075 216 216 0 119.291-96.61 216-216 216-119.244 0-216-96.562-216-216 0-119.203 96.602-216 216-216m0-32C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm-11.49 120h22.979c6.823 0 12.274 5.682 11.99 12.5l-7 168c-.268 6.428-5.556 11.5-11.99 11.5h-8.979c-6.433 0-11.722-5.073-11.99-11.5l-7-168c-.283-6.818 5.167-12.5 11.99-12.5zM256 340c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28z" />
                  </svg>
                  <span className="sib-form-message-panel__inner-text">
                    Your subscription could not be saved. Please try again.
                  </span>
                </div>
              </div>

              <div id="success-message" className="sib-form-message-panel">
                <div className="sib-form-message-panel__text sib-form-message-panel__text--center">
                  <svg
                    viewBox="0 0 512 512"
                    className="sib-icon sib-notification__icon"
                  >
                    <path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 464c-118.664 0-216-96.055-216-216 0-118.663 96.055-216 216-216 118.664 0 216 96.055 216 216 0 118.663-96.055 216-216 216zm141.63-274.961L217.15 376.071c-4.705 4.667-12.303 4.637-16.97-.068l-85.878-86.572c-4.667-4.705-4.637-12.303.068-16.97l8.52-8.451c4.705-4.667 12.303-4.637 16.97.068l68.976 69.533 163.441-162.13c4.705-4.667 12.303-4.637 16.97.068l8.451 8.52c4.668 4.705 4.637 12.303-.068 16.97z" />
                  </svg>
                  <span className="sib-form-message-panel__inner-text">
                    You're subscribed! Check your inbox.
                  </span>
                </div>
              </div>

              <div
                id="sib-container"
                className="sib-container--large sib-container--vertical"
              >
                <form
                  id="sib-form"
                  method="POST"
                  target="brevo-hidden-submit-frame"
                  action="https://a259fedd.sibforms.com/serve/MUIFAGy1RnOlH3yS-IXFb-zvllCgR80jIkjDr2GQmblK1H2pJBkA9ZQ1s7uAZ48QttF10oyJ_quvQve8i2Uc9sNY1ERdmathaVbA14jUSswlz2_WDQTxq6ibYhzTbXh61IiI4e7eg5KcPwtergOfLSZ8PHAFpCglm7yReAW_2tHCn4PVw5ceDiy1xmrKRCYLldShibIoEXHY3i0s"
                  data-type="subscription"
                >
                  <div className="field-group">
                    <div className="sib-input sib-form-block">
                      <div className="form__entry entry_block">
                        <div className="form__label-row">
                          <label className="entry__label" htmlFor="EMAIL">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="2" y="4" width="20" height="16" rx="2" />
                              <path d="m22 7-10 7L2 7" />
                            </svg>
                            Email address
                          </label>

                          <div
                            className="entry__field"
                            style={{
                              padding: "4px",
                              borderRadius: "15px",
                            }}
                          >
                            <input
                              className="input"
                              type="email"
                              id="EMAIL"
                              name="EMAIL"
                              autoComplete="email"
                              inputMode="email"
                              placeholder="you@company.com"
                              data-required="true"
                              aria-label="Email address"
                              required
                            />
                            <div>
                              <button
                                className="sib-form-block__button sib-form-block__button-with-loader"
                                form="sib-form"
                                type="submit"
                                aria-label="Subscribe to newsletter"
                              >
                                <svg
                                  className="icon clickable__icon progress-indicator__icon sib-hide-loader-icon"
                                  viewBox="0 0 512 512"
                                  style={{
                                    width: "14px",
                                    height: "14px",
                                    marginRight: "6px",
                                  }}
                                >
                                  <path d="M460.116 373.846l-20.823-12.022c-5.541-3.199-7.54-10.159-4.663-15.874 30.137-59.886 28.343-131.652-5.386-189.946-33.641-58.394-94.896-95.833-161.827-99.676C261.028 55.961 256 50.751 256 44.352V20.309c0-6.904 5.808-12.337 12.703-11.982 83.556 4.306 160.163 50.864 202.11 123.677 42.063 72.696 44.079 162.316 6.031 236.832-3.14 6.148-10.75 8.461-16.728 5.01z" />
                                </svg>
                                Subscribe
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ marginLeft: "2px" }}
                                >
                                  <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        <span
                          className="entry__error entry__error--primary"
                          aria-live="polite"
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="field-hint"
                    style={{
                      marginTop: "8px",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    No spam. Unsubscribe anytime.
                  </div>

                  <input
                    type="text"
                    name="email_address_check"
                    defaultValue=""
                    className="input--hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <input type="hidden" name="locale" value="en" />
                </form>

                <iframe
                  title="brevo-hidden-submit-frame"
                  name="brevo-hidden-submit-frame"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <script>{`
            window.REQUIRED_CODE_ERROR_MESSAGE = 'Please choose a country code';
            window.LOCALE = 'en';
            window.EMAIL_INVALID_MESSAGE = window.SMS_INVALID_MESSAGE = "The information provided is invalid. Please review the field format and try again.";
            window.REQUIRED_ERROR_MESSAGE = "This field cannot be left blank. ";
            window.GENERIC_INVALID_MESSAGE = "The information provided is invalid. Please review the field format and try again.";
            window.INVALID_NUMBER = "The information provided is invalid. Please review the field format and try again.";
            window.INVALID_DATE = "Please enter a valid date";
            window.REQUIRED_MULTISELECT_MESSAGE = 'Please select at least 1 option';
            window.translation = {
              common: {
                selectedList: '{quantity} list selected',
                selectedLists: '{quantity} lists selected',
                selectedOption: '{quantity} selected',
                selectedOptions: '{quantity} selected',
              },
            };
            window.AUTOHIDE = Boolean(0);
          `}</script>
          <script
            defer
            src="https://sibforms.com/forms/end-form/build/main.js"
          />
        </div>
      </div>
    </section>
  );
}

export default NewsletterSubscription;
