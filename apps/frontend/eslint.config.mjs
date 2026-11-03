import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import boundaries from 'eslint-plugin-boundaries';

const SHARED = ['context', 'lib'];
const REQUESTS_ENTRY = { type: 'request', fileInternalPath: 'index.ts' };

const element = (type, extra = {}) => ({ element: { type, ...extra } });
const external = (source) => ({ module: { origin: 'external', source } });

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierRecommended,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      'react/jsx-key': 'error',
      'react/no-array-index-key': 'warn',
      'react/self-closing-comp': 'error',
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],
      'react/no-unknown-property': 'error',
      'import/no-duplicates': 'error',
      'import/no-cycle': 'warn',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'always'],
      'no-param-reassign': ['warn', { props: false }],
      'max-classes-per-file': ['error', 1],
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
    },
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    ignores: ['app/lib/request/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Network calls live in app/lib/request; import them from @/requests.',
        },
      ],
    },
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: `${import.meta.dirname}/tsconfig.json` },
      },
      'boundaries/root-path': import.meta.dirname,
      'boundaries/flag-as-external': {
        customSourcePatterns: ['@chess/*', '@chess/*/**'],
      },
      'boundaries/elements': [
        {
          type: 'component',
          pattern: 'app/components/*',
          capture: ['component'],
          partialMatch: false,
        },
        { type: 'components', pattern: 'app/components', partialMatch: false },
        { type: 'context', pattern: 'app/lib/context', partialMatch: false },
        { type: 'request', pattern: 'app/lib/request', partialMatch: false },
        { type: 'lib', pattern: 'app/lib', partialMatch: false },
        {
          type: 'feature',
          pattern: 'app/*',
          capture: ['feature'],
          partialMatch: false,
        },
        { type: 'shell', pattern: 'app', partialMatch: false },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          checkUnknownLocals: true,
          checkInternals: true,
          message:
            '{{ from.element.type }} may not depend on {{ to.element.type }} {{ to.element.fileInternalPath }}: see the boundaries policies in eslint.config.mjs.',
          policies: [
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
            { allow: { dependency: { relationship: { to: 'internal' } } } },
            {
              disallow: {
                to: {
                  module: { origin: 'local' },
                  element: { isUnknown: true },
                },
              },
              message:
                '{{ dependency.source }} is outside the frontend architecture: apps never import each other.',
            },
            {
              disallow: {
                dependency: { source: ['@chess/*/src/**', '@chess/*/dist/**'] },
              },
              message:
                'Import @chess/* packages by their entry, not src/ or dist/.',
            },
            {
              disallow: { to: external(['backend', 'backend/**']) },
              message:
                'Apps never import each other; share code through @chess/contract.',
            },
            {
              from: element('shell'),
              allow: {
                to: [
                  element('components'),
                  element(SHARED),
                  { element: REQUESTS_ENTRY },
                ],
              },
            },
            {
              from: element('feature'),
              allow: {
                to: [
                  element('components'),
                  element(SHARED),
                  { element: REQUESTS_ENTRY },
                ],
              },
            },
            {
              from: element('components'),
              allow: { to: element('component') },
            },
            {
              from: element('component'),
              allow: { to: [element(SHARED), { element: REQUESTS_ENTRY }] },
            },
            {
              from: element('context'),
              allow: { to: [element('lib'), { element: REQUESTS_ENTRY }] },
            },
            {
              from: element('request'),
              allow: { to: element('lib') },
            },
            {
              from: element([
                'shell',
                'feature',
                'component',
                'components',
                'lib',
              ]),
              disallow: { to: external(['axios', 'socket.io-client']) },
              message:
                'UI talks to the backend only through @/requests and the socket context.',
            },
            {
              from: element('context'),
              disallow: { to: external('axios') },
              message: 'Contexts call REST through @/requests.',
            },
            {
              from: element('request'),
              disallow: { to: external('socket.io-client') },
              message:
                'The socket lives in SocketContext, not in request functions.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-optional-chain': 'warn',
    },
  },
]);
