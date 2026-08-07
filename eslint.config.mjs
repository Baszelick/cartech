import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],

  {
    ignores: ['**/dist'],
  },

  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],

    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,

          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],

          depConstraints: [
            /**
             * Приложение может собирать любые слои.
             *
             * app
             *  ↓
             * feature
             * data-access
             * ui
             * models
             */
            {
              sourceTag: 'type:app',

              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:data-access',
                'type:ui',
                'type:models',
                'type:util',
                'type:core',
              ],
            },

            /**
             * Feature слой.
             *
             * Пример:
             *
             * cars-feature
             * admin-feature
             *
             * Может использовать:
             *
             * feature
             * data-access
             * ui
             * models
             * util
             * core
             */
            {
              sourceTag: 'type:feature',

              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:data-access',
                'type:ui',
                'type:models',
                'type:util',
                'type:core',
              ],
            },

            /**
             * Data-access слой.
             *
             * Сервисы, stores, API.
             *
             * Не знает про feature и ui.
             *
             * data-access
             *        ↓
             * core
             * models
             */
            {
              sourceTag: 'type:data-access',

              onlyDependOnLibsWithTags: [
                'type:data-access',
                'type:core',
                'type:models',
                'type:util',
              ],
            },

            /**
             * Core слой.
             *
             * Самый нижний уровень.
             *
             * Примеры:
             *
             * users
             * locations
             * sites
             * permissions
             *
             * Никогда не знает про бизнес-фичи.
             */
            {
              sourceTag: 'type:core',

              onlyDependOnLibsWithTags: ['type:core', 'type:models', 'type:util'],
            },

            /**
             * UI библиотека.
             *
             * Кнопки, инпуты, модалки.
             */
            {
              sourceTag: 'type:ui',

              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },

            /**
             * Models.
             *
             * Только типы и утилиты.
             */
            {
              sourceTag: 'type:models',

              onlyDependOnLibsWithTags: ['type:models', 'type:util'],
            },

            /**
             * Utils.
             *
             * Самый нижний технический слой.
             */
            {
              sourceTag: 'type:util',

              onlyDependOnLibsWithTags: ['type:util'],
            },

            /**
             * Shared scope.
             *
             * Общие библиотеки.
             */
            {
              sourceTag: 'scope:shared',

              onlyDependOnLibsWithTags: ['scope:shared'],
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],

    rules: {},
  },
];
