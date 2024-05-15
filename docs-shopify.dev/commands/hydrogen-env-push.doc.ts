// This is an autogenerated file. Don't edit this file manually.
import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs'

const data: ReferenceEntityTemplateSchema = {
  name: 'hydrogen env push',
  description: `Push environment variables from the local .env file to your linked Hydrogen storefront.`,
  overviewPreviewDescription: `Push environment variables from the local .env file to your linked Hydrogen storefront.`,
  type: 'command',
  isVisualComponent: false,
  defaultExample: {
    codeblock: {
      tabs: [
        {
          title: 'hydrogen env push',
          code: './examples/hydrogen-env-push.example.sh',
          language: 'bash',
        },
      ],
      title: 'hydrogen env push',
    },
  },
  definitions: [
  {
    title: 'Flags',
    description: 'The following flags are available for the `hydrogen env push` command:',
    type: 'hydrogenenvpush',
  },
  ],
  category: 'hydrogen commands',
  related: [
  ],
}

export default data