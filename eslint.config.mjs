import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,

  {
    ignores: ['dist', 'node_modules'],
  },

  {
    files: ['src/**/*.ts'],

    rules: {
      // Variáveis não usadas
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Aspas simples
      quotes: ['error', 'single'],

      // Sem ;
      semi: ['error', 'never'],

      // Indentação 2 espaços
      indent: ['error', 2],

      // Tamanho máximo linha
      'max-len': [
        'warn',
        {
          code: 100,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],

      // Console permitido
      'no-console': 'off',
    },
  },
)
