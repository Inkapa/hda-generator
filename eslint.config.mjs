import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    // Use compat.config() which allows merging 'extends' with 'rules'
    ...compat.config({
        extends: [
            "next/core-web-vitals",
            "next/typescript"
        ],
        rules: {
            // Disable the rule that bans using the `any` type
            "@typescript-eslint/no-explicit-any": "off",
            '@typescript-eslint/ban-ts-comment': [
                'error',
                {'ts-ignore': 'allow-with-description'},
            ],
        },
    }),
];

export default eslintConfig;