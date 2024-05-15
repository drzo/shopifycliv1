import { readFileSync } from "fs"

const packagesWithUMDexports = [
  'jsonc-parser',
  'vscode-json-languageservice',
  'vscode-languageserver-types',
  'vscode-languageserver-textdocument'
]

const ShopifyVSCodePlugin = {
  name: "ShopifyVSCodePlugin",
  setup(build) {
    build.onLoad({ filter: /\/umd\// }, (args) => {
      // If the file is part of a known bad dependency, load the esm version instead
      if (packagesWithUMDexports.some(pkg => args.path.includes(pkg))) {
        const contents = readFileSync(args.path.replace('umd', 'esm'), 'utf8')
        return { contents: contents, loader: 'default'}
      }
    })
  }
}

export default ShopifyVSCodePlugin
