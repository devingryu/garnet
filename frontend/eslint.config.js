import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
    {
        // Generated and vendored code, kept in its upstream style on purpose
        // (AGENTS.md rule 14).
        ignores: ['dist/**', 'wailsjs/**', 'src/components/ui/**', 'src/lib/utils.ts'],
    },
    js.configs.recommended,
    tseslint.configs.recommended,
    reactHooks.configs.flat['recommended-latest'],
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.browser,
        },
        plugins: {'react-refresh': reactRefresh},
        rules: {
            'react-refresh/only-export-components': ['warn', {allowConstantExport: true}],
            // An unused binding is nearly always a leftover; `_` prefixed ones
            // are the deliberate exception.
            '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
        },
    }
);
