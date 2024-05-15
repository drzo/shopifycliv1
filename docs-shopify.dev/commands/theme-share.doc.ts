// This is an autogenerated file. Don't edit this file manually.
import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs'

const data: ReferenceEntityTemplateSchema = {
  name: 'theme share',
  description: `Uploads your theme as a new, unpublished theme in your theme library. The theme is given a randomized name.

  This command returns a [preview link](https://help.shopify.com/manual/online-store/themes/adding-themes?shpxid=cee12a89-AA22-4AD3-38C8-91C8FC0E1FB0#share-a-theme-preview-with-others) that you can share with others.`,
  overviewPreviewDescription: `Creates a shareable, unpublished, and new theme on your theme library with a randomized name.`,
  type: 'command',
  isVisualComponent: false,
  defaultExample: {
    codeblock: {
      tabs: [
        {
          title: 'theme share',
          code: './examples/theme-share.example.sh',
          language: 'bash',
        },
      ],
      title: 'theme share',
    },
  },
  definitions: [
  {
    title: 'Flags',
    description: 'The following flags are available for the `theme share` command:',
    type: 'themeshare',
  },
  ],
  category: 'theme commands',
  related: [
  ],
}

export default data