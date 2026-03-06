import React from "react";
import Image from "next/image";

import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import styles from "./ErrorBoundary.module.css";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  constructor(props) {
    super(props);

    // Define a state variable to track whether is an error or not
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI

    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    // You can use your own error logging service here
    console.log({ error, errorInfo });
  }
  render() {
    // Check if the error is thrown
    if ((this.state as { hasError: boolean }).hasError) {
      // You can render any custom fallback UI
      return (
        <div className={styles.container}>
          <div className={styles.stack}>
            <Image
              src={getFileUrlFromKey("/images/error-img.svg", false)}
              alt="image for error"
              className={styles.image}
              height={220}
              width={300}
            />
            <h1 className={styles.title}>Uh-oh!</h1>
            <p className={styles.text}>
              Something Went Wrong. <br />
              If the issue persists, please contact support.
            </p>
            <div className={styles.buttonContainer}>
              <button
                className={styles.button}
                onClick={() => this.setState({ hasError: false })}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Return children components in case of no error

    return this.props.children;
  }
}

export default ErrorBoundary;
