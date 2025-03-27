"use client";

import { useState } from "react";

import styles from "./navbar.module.css";

export default function Navbar() {
  const [staticVars, setStaticVars] = useState(false);
  const [globalVars, setGlobalVars] = useState(false);
  const [autosave, setAutosave] = useState(false);

  return (
    <div className={styles.navbar}>
      <div className={styles.leftSection}>
        <button className={styles.backButton}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 19L5 12L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className={styles.title}>My chatbot</span>

        <div className={styles.toggleContainer}>
          <span>Static Variables</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={staticVars}
              onChange={() => setStaticVars(!staticVars)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.toggleContainer}>
          <span>Global Variables</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={globalVars}
              onChange={() => setGlobalVars(!globalVars)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <button className={styles.toolButton}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.testButton}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M10 8L16 12L10 16V8Z" fill="currentColor" />
          </svg>
          Test Bot
        </button>

        <div className={styles.toggleContainer}>
          <span>Autosave</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={autosave}
              onChange={() => setAutosave(!autosave)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <button className={styles.undoButton}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 10H13C17.4183 10 21 13.5817 21 18V20M3 10L9 16M3 10L9 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button className={styles.redoButton}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 10H11C6.58172 10 3 13.5817 3 18V20M21 10L15 16M21 10L15 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button className={styles.saveButton}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="currentColor"
            />
          </svg>
          Save
        </button>
      </div>
    </div>
  );
}
