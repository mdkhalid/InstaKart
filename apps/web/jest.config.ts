import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^lucide-react$": "<rootDir>/__mocks__/lucide-react.tsx",
    "^next/image$": "<rootDir>/__mocks__/next-image.tsx",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      tsconfig: {
        jsx: "react-jsx",
        target: "es2020",
        module: "commonjs",
        esModuleInterop: true,
        strict: true,
        moduleResolution: "node",
        paths: { "@/*": ["./*"] },
      },
    }],
  },
};

export default config;
