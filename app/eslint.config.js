import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Färger hämtas ur design/tema.ts (TS) eller CSS-variablerna som genereras därifrån,
// aldrig som hex-literaler i komponenter (docs/arkitektur.md avsnitt 1). Regeln
// varnar tills WP12b, då den blir fel.
const HEX = '/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z])/'
const HEX_MEDDELANDE = 'Hex-färg i kod: hämta färgen ur design/tema.ts eller en CSS-variabel (--farg-…).'

// Gamla vyns frysta filer (arkitektur.md avsnitt 1) och det gamla grafprovet
// (skrivs om av WP2) undantas; de raderas eller skrivs om senare.
const FRYSTA = [
  'src/components/**',
  'src/charts/tidsserie.ts',
  'src/charts/constants.ts',
  'src/charts/types.ts',
  'src/types.ts',
  'src/utils/**',
  'src/theme/**',
  'verktyg/grafprov.tsx',
]

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
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Tillåt avsiktligt oanvända argument/variabler med _-prefix (kodkonvention)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'verktyg/**/*.{ts,tsx}'],
    ignores: ['src/design/**', ...FRYSTA],
    rules: {
      'no-restricted-syntax': [
        'warn',
        { selector: `Literal[value=${HEX}]`, message: HEX_MEDDELANDE },
        { selector: `TemplateElement[value.raw=${HEX}]`, message: HEX_MEDDELANDE },
      ],
    },
  },
])
