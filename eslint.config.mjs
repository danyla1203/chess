import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

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
    },
  },
  {
    files: [
      'src/game/**/*.ts',
      'src/game-service/**/*.ts',
      'src/infrastructure/game/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/gateway',
                '**/gateway/**',
                '**/auth',
                '**/auth/**',
                '**/user',
                '**/user/**',
                '**/payments',
                '**/payments/**',
                '**/game-history',
                '**/game-history/**',
                '**/prisma.service',
              ],
              message:
                'game-svc runs without core: reach core through gRPC replies, the event stream or socket emits, not imports.',
            },
            {
              regex: 'game-read(?!/views$)',
              message:
                'game-svc writes the read models; it may share their types, not read them.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/game/**',
      'src/game-service/**',
      'src/infrastructure/game/**',
      'src/domain/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/game-service',
                '**/game-service/**',
                '**/infrastructure/game',
                '**/infrastructure/game/**',
              ],
              message: 'core talks to game-svc through GameClient (gRPC) and GameReadModel.',
            },
            {
              group: [
                '**/game/*',
                '!**/generated/**',
                '!**/game/dto',
                '!**/game/game.contract',
                '!**/domain/game/**',
              ],
              message:
                'core may only use game contracts, DTOs, entities and EmitTypes; game logic runs in game-svc.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '(^|/)(infrastructure|generated|dto|game-service|game-read|game-history|gateway|auth|user|payments|health)/|\\.\\./game/|^(ioredis|socket\\.io|@prisma/|@opentelemetry/|@grpc/)',
              message:
                'domain is the pure game model: no infrastructure, transport or application-layer imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      'no-console': 'off',
    },
  },
);
