// This is an autogenerated file. Don't edit this file manually.
import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs'

const data: ReferenceEntityTemplateSchema = {
  name: 'app function build',
  description: `Compiles the function in your current directory to WebAssembly (Wasm) for testing purposes.`,
  overviewPreviewDescription: `Compile a function to wasm.`,
  type: 'command',
  isVisualComponent: false,
  defaultExample: {
    codeblock: {
      tabs: [
        {
          title: 'app function build',
          code: './examples/app-function-build.example.sh',
          language: 'bash',
        },
      ],
      title: 'app function build',
    },
  },
  definitions: [
  {
    title: 'Flags',
    description: 'The following flags are available for the `app function build` command:',
    type: 'appfunctionbuild',
  },
  ],
  category: 'Commands',
  subCategory: 'app',
  related: [
  ],
}

export default data