// This is an autogenerated file. Don't edit this file manually.
import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs'

const data: ReferenceEntityTemplateSchema = {
  name: 'app info',
  description: `The information returned includes the following:

  - The app and development store or Plus sandbox store that's used when you run the [dev](https://shopify.dev/docs/apps/tools/cli/commands#dev) command. You can reset these configurations using [dev --reset](https://shopify.dev/docs/apps/tools/cli/commands#dev).
  - The [structure](https://shopify.dev/docs/apps/tools/cli/structure) of your app project.
  - The [access scopes](https://shopify.dev/docs/api/usage) your app has requested.
  - System information, including the package manager and version of Shopify CLI used in the project.`,
  overviewPreviewDescription: `Print basic information about your app and extensions.`,
  type: 'command',
  isVisualComponent: false,
  defaultExample: {
    codeblock: {
      tabs: [
        {
          title: 'app info',
          code: './examples/app-info.example.sh',
          language: 'bash',
        },
      ],
      title: 'app info',
    },
  },
  definitions: [
  {
    title: 'Flags',
    description: 'The following flags are available for the `app info` command:',
    type: 'appinfo',
  },
  ],
  category: 'app commands',
  related: [
  ],
}

export default data