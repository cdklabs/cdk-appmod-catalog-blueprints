const {themes} = require('prism-react-renderer');

const config = {
  title: 'AppMod Catalog Blueprints',
  tagline: 'Deploy customizable production-ready applications in minutes.',
  url: 'https://cdklabs.github.io',
  baseUrl: '/cdk-appmod-catalog-blueprints/',
  onBrokenLinks: 'warn',
  favicon: 'img/favicon.ico',

  organizationName: 'cdklabs',
  projectName: 'cdk-appmod-catalog-blueprints',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    hooks: {
      onBrokenMarkdownImages: 'warn',
      onBrokenMarkdownLinks: 'warn',
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main/',
          include: ['**/README.md'],
          exclude: ['**/node_modules/**', '**/website/**', '**/.git/**', '**/cdk.out/**'],
          routeBasePath: 'docs',
          sidebarItemsGenerator: async function ({
            defaultSidebarItemsGenerator,
            ...args
          }) {
            const sidebarItems = await defaultSidebarItemsGenerator(args);
            // Exclude READMEs that are used as category links to avoid duplication
            const categoryLinkIds = [
              'examples/README',
              'use-cases/README',
              'use-cases/document-processing/README',
              'use-cases/webapp/README', 
              'use-cases/framework/README',
              'use-cases/utilities/README'
            ];
            return sidebarItems.filter(item => !categoryLinkIds.includes(item.id));
          },
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'AppMod Catalog Blueprints',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/cdklabs/cdk-appmod-catalog-blueprints/tree/main',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://construct-hub-testing.dev-tools.aws.dev/packages/@cdklabs/appmod-catalog-blueprints',
          label: 'API Reference',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Amazon Web Services, Inc.`,
    },
    prism: {
      theme: themes.github,
      darkTheme: themes.dracula,
      additionalLanguages: ['typescript', 'json'],
    },
  },
};

module.exports = config;
