import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/storybook-static/**',
      '**/coverage/**',
      '**/src/generated/**',
      '.catalogue/**',
      '.catalogue-decisions/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [jsxA11y.flatConfigs.strict, reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    // Claude Code workflow scripts run in the workflow runtime, which provides these globals.
    files: ['.claude/workflows/**/*.js'],
    languageOptions: {
      globals: {
        agent: 'readonly',
        args: 'readonly',
        budget: 'readonly',
        log: 'readonly',
        parallel: 'readonly',
        phase: 'readonly',
        pipeline: 'readonly',
        workflow: 'readonly',
      },
    },
  },
  storybook.configs['flat/recommended'],
  prettier,
);
