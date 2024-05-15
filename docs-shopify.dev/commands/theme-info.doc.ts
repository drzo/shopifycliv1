// This is an autogenerated file. Don't edit this file manually.
import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs'

const data: ReferenceEntityTemplateSchema = {
  name: 'theme info',
  description: `Displays information about your theme environment, including your current store. Can also retrieve information about a specific theme.`,
  overviewPreviewDescription: `Displays information about your theme environment, including your current store. Can also retrieve information about a specific theme.`,
  type: 'command',
  isVisualComponent: false,
  defaultExample: {
    codeblock: {
      tabs: [
        {
          title: 'theme info',
          code: './examples/theme-info.example.sh',
          language: 'bash',
        },
      ],
      title: 'theme info',
    },
  },
  definitions: [
  {
    title: 'Flags',
    description: 'The following flags are available for the `theme info` command:',
    type: 'themeinfo',
  },
  ],
  category: 'theme',
  related: [
  ],
}

export default data