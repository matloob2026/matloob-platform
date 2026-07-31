import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "public/**"],
  },
  {
    rules: {
      // Phase 1 service stubs intentionally prefix not-yet-used
      // parameters with `_` (e.g. `_requestId`) to document the future
      // method signature before real logic lands in Phase 3. This isn't
      // dead code to clean up — it's the architecture contract.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
