import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';
import {defineConfig, globalIgnores} from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Import sorting
      'simple-import-sort/imports': ['warn', {
        groups: [[
          '^react$', '^[a-z]',
          '^@',
          '^~',
          '^\\.\\.(?!/?$)', '^\\.\\./?$',
          '^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$',
          '^.+\\.s?css$',
          '^\\u0000',
        ]],
      }],
      'simple-import-sort/exports': 'warn',

      // Style
      'max-len': ['warn', {code: 120}],
      'arrow-parens': ['warn', 'as-needed'],
      'arrow-spacing': ['warn', {before: true, after: true}],
      'array-bracket-spacing': ['error', 'never'],
      'object-curly-spacing': ['error', 'never'],
      'indent': ['error', 2],
      'no-console': 'warn',
      'no-eval': 'error',

      // Google style rules
      'curly': ['error', 'multi-line'],
      'guard-for-in': 'error',
      'no-caller': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-multi-spaces': 'error',
      'no-multi-str': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'no-with': 'error',
      'prefer-promise-reject-errors': 'error',
      'block-spacing': ['error', 'never'],
      'brace-style': 'error',
      'camelcase': ['error', {properties: 'never'}],
      'comma-dangle': ['error', 'always-multiline'],
      'comma-spacing': 'error',
      'comma-style': 'error',
      'computed-property-spacing': 'error',
      'eol-last': 'error',
      'func-call-spacing': 'error',
      'key-spacing': 'error',
      'keyword-spacing': 'error',
      'new-cap': 'error',
      'no-array-constructor': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-multiple-empty-lines': ['error', {max: 2}],
      'no-tabs': 'error',
      'no-trailing-spaces': 'error',
      'one-var': ['error', {var: 'never', let: 'never', const: 'never'}],
      'operator-linebreak': ['error', 'after'],
      'padded-blocks': ['error', 'never'],
      'quote-props': ['error', 'consistent'],
      'quotes': ['error', 'single', {allowTemplateLiterals: true}],
      'semi': 'error',
      'semi-spacing': 'error',
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', {
        asyncArrow: 'always',
        anonymous: 'never',
        named: 'never',
      }],
      'spaced-comment': ['error', 'always'],
      'switch-colon-spacing': 'error',
      'no-var': 'error',
      'prefer-const': ['error', {destructuring: 'all'}],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'rest-spread-spacing': 'error',
    },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      'max-len': 'off',
    },
  },
]);
