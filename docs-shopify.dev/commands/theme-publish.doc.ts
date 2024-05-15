// This is an autogenerated file. Don't edit this file manually.
import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs'

const data: ReferenceEntityTemplateSchema = {
  name: 'theme publish',
  description: `Publishes an unpublished theme from your theme library.

If no theme ID is specified, then you're prompted to select the theme that you want to publish from the list of themes in your store.

You can run this command only in a directory that matches the [default Shopify theme folder structure](/docs/themes/tools/cli#directory-structure).

If you want to publish your local theme, then you need to run \`shopify theme push\` first. You're asked to confirm that you want to publish the specified theme. You can skip this confirmation using the \`--force\` flag.`,
  overviewPreviewDescription: `Set a remote theme as the live theme.`,
  type: 'command',
  isVisualComponent: false,
  defaultExample: {
    codeblock: {
      tabs: [
        {
          title: 'theme publish',
          code: './examples/theme-publish.example.sh',
          language: 'bash',
        },
      ],
      title: 'theme publish',
    },
  },
  definitions: [
  {
    title: 'Flags',
    description: 'The following flags are available for the `theme publish` command:',
    type: 'themepublish',
  },
  ],
  category: 'theme',
  related: [
  ],
}

export default data