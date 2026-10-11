import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'dist-pages/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', '.artifacts/**'] },
  js.configs.recommended, ...tseslint.configs.recommended,
  { files: ['**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'error', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  { files: ['scripts/*.js'], languageOptions: { globals: { self: 'readonly', caches: 'readonly', URL: 'readonly', fetch: 'readonly', Response: 'readonly', Headers: 'readonly', Request: 'readonly', __SCOPE_ID__: 'readonly', __PRECACHE__: 'readonly' } } }
);
