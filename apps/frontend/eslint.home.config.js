import parser from "@typescript-eslint/parser";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  {
    files: ["src/pages/public/Home.tsx", "src/pages/public/home/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    languageOptions: { parser },
    plugins: { sonarjs },
    rules: {
      complexity: ["error", 10],
      "sonarjs/cognitive-complexity": ["error", 10],
    },
  },
];
