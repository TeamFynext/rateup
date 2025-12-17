import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        isolatedModules: true,
      },
    ],
  },
};

export default config;
