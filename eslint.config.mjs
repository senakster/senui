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
    // Type tests evaluate expressions only for their types (`void (<Button variant="x" />)` under an
    // @ts-expect-error), and omit fields by destructuring. They are type-checked, never executed.
    files: ['**/*.test-d.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-meaningless-void-operator': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    // Principle 4 / ADR-0004: primitives are never emitted, so a reference to one in a style
    // string is always a bug. Stylelint covers .css (ADR-0007); this covers inline styles in TS.
    files: ['packages/react/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...['Literal', 'TemplateElement'].flatMap((node) => {
          const value = node === 'Literal' ? 'value' : 'value.raw';
          return [
            {
              selector: `${node}[${value}=/--senui-primitive-/]`,
              message: 'Primitive tokens are never emitted (ADR-0004). Use a semantic token.',
            },
            {
              selector: `${node}[${value}=/--senui-color-[a-z]+-[0-9]+/]`,
              message: 'Numbered colour steps are primitives (ADR-0004). Use a semantic token.',
            },
          ];
        }),
      ],
    },
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
