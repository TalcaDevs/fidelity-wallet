import parser from "@typescript-eslint/parser";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  {
    files: ["src/pages/public/Home.tsx", "src/pages/public/home/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    languageOptions: { parser },
    plugins: { sonarjs },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='svg']",
          message: "Import an SVG asset instead of embedding its markup in a Home component.",
        },
      ],
      complexity: ["error", 10],
      "sonarjs/cognitive-complexity": ["error", 10],
    },
  },
];
