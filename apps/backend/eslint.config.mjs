import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

const GAME_SVC = ['game', 'game-svc', 'game-infra'];
const PUBLIC_SURFACE = ['index.ts', '*.module.ts', 'dto/**', 'entities/**'];
const PERSISTENCE = {
  type: 'infra',
  captured: { adapter: ['prisma', 'redis'] },
};
const DB_CLIENTS = ['ioredis', '@prisma/client', '@prisma/adapter-pg'];

const element = (type, extra = {}) => ({ element: { type, ...extra } });
const external = (source) => ({ module: { origin: 'external', source } });

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'src/generated/**',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false } },
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'warn',
        { considerDefaultExhaustiveForUnions: true },
      ],
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'always'],
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-case-declarations': 'error',
      'no-return-assign': 'error',
      'no-param-reassign': ['warn', { props: false }],
      'max-classes-per-file': ['error', 1],
    },
  },
  {
    files: ['src/**/*.ts'],
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
        { type: 'domain', pattern: 'src/domain', partialMatch: false },
        { type: 'generated', pattern: 'src/generated', partialMatch: false },
        {
          type: 'game-infra',
          pattern: 'src/infrastructure/game',
          partialMatch: false,
        },
        {
          type: 'infra',
          pattern: 'src/infrastructure/*',
          capture: ['adapter'],
          partialMatch: false,
        },
        { type: 'game', pattern: 'src/game', partialMatch: false },
        { type: 'game-svc', pattern: 'src/game-service', partialMatch: false },
        {
          type: 'module',
          pattern: 'src/*',
          capture: ['module'],
          partialMatch: false,
        },
        { type: 'root', pattern: 'src', partialMatch: false },
      ],
      'boundaries/files': [
        {
          category: 'controller',
          pattern: ['**/*.controller.ts', '**/*.gateway.ts'],
        },
        { category: 'service', pattern: 'src/*/*.service.ts' },
        {
          category: 'repository',
          pattern: ['**/*.model.ts', '**/model.ts', '**/*.repository.ts'],
        },
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
                '{{ dependency.source }} is outside the backend architecture: apps never import each other.',
            },
            {
              disallow: {
                dependency: { source: ['@chess/*/src/**', '@chess/*/dist/**'] },
              },
              message:
                'Import @chess/* packages by their entry, not src/ or dist/.',
            },
            {
              disallow: {
                to: external(['frontend', 'frontend/**', 'backend']),
              },
              message:
                'Apps never import each other; share code through @chess/contract.',
            },
            {
              from: element('domain'),
              disallow: {
                to: external([
                  'ioredis',
                  'socket.io',
                  'socket.io-client',
                  '@prisma/*',
                  '@opentelemetry/*',
                  '@grpc/*',
                ]),
              },
              message:
                'domain is the pure game model: no infrastructure, transport or application-layer imports.',
            },
            {
              from: element('infra'),
              allow: {
                to: [element('domain'), element('generated'), element('infra')],
              },
            },
            {
              from: element(GAME_SVC),
              allow: {
                to: [
                  element('domain'),
                  element('generated'),
                  element('infra'),
                  element(GAME_SVC),
                  element('module', {
                    captured: { module: 'game-read' },
                    fileInternalPath: 'views.ts',
                  }),
                  element('module', {
                    captured: { module: 'health' },
                    fileInternalPath: PUBLIC_SURFACE,
                  }),
                ],
              },
            },
            {
              from: element(['module', 'root']),
              allow: {
                to: [
                  element('domain'),
                  element('generated'),
                  element('infra'),
                  element('module', { fileInternalPath: PUBLIC_SURFACE }),
                  element('game', {
                    fileInternalPath: ['game.contract.ts', 'dto/**'],
                  }),
                ],
              },
            },
            {
              from: element('root'),
              allow: { to: element('module') },
            },
            {
              from: { file: { categories: 'controller' } },
              disallow: {
                to: [
                  { file: { categories: 'repository' } },
                  { element: PERSISTENCE },
                  external(DB_CLIENTS),
                ],
              },
              message:
                'Controllers and gateways call services; only *.model.ts / *.repository.ts touch Prisma or Redis.',
            },
            {
              from: { file: { path: '**/*health.controller.ts' } },
              allow: { to: [{ element: PERSISTENCE }, external(DB_CLIENTS)] },
            },
            {
              from: { file: { categories: 'service' } },
              disallow: { to: { file: { categories: 'controller' } } },
              message: 'Services must not depend on controllers or gateways.',
            },
            {
              from: { file: { categories: 'repository' } },
              disallow: {
                to: { file: { categories: ['service', 'controller'] } },
              },
              message:
                'Repositories are the bottom layer: no services or controllers.',
            },
            {
              from: element(GAME_SVC),
              disallow: {
                to: element('infra', { captured: { adapter: 'prisma' } }),
              },
              message:
                'game-svc runs without core: reach core through gRPC replies, the event stream or socket emits, not imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      'max-classes-per-file': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      'no-console': 'off',
    },
  },
);
