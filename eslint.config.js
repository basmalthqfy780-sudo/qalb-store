import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

const reactHooksRules = reactHooks.configs['recommended-latest']?.rules || reactHooks.configs.recommended?.rules || {}

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'src/fonts.css', 'tests/build/**', 'coverage/**', '*.min.*'],
  },

  js.configs.recommended,

  /* the app itself: browser + JSX + the hooks rules that caught the /order bug */
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooksRules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  /* build scripts, the order server and the test harness run in node */
  {
    files: ['scripts/**/*.{js,mjs}', 'server/**/*.js', 'tests/**/*.{js,mjs,jsx}', 'vite.config.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }] },
  },

  /* the harness bundles JSX through esbuild, so let it keep its own style */
  {
    files: ['tests/entry.jsx'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
]
