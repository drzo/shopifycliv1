// This is an autogenerated file. Don't edit this file manually.
export interface hydrogeninit {
  /**
   * Overwrites the destination directory and files if they already exist.
   */
  '-f, --force'?: ''

  /**
   * The path to the directory of the new Hydrogen storefront.
   */
  '--path <value>'?: string

  /**
   * Sets the template language to use. One of `js` or `ts`.
   */
  '--language <value>'?: string

  /**
   * Scaffolds project based on an existing template or example from the Hydrogen repository.
   */
  '--template <value>'?: string

  /**
   * Auto installs dependencies using the active package manager.
   */
  '--install-deps'?: ''

  /**
   * Use mock.shop as the data source for the storefront.
   */
  '--mock-shop'?: ''

  /**
   * Sets the styling strategy to use. One of `tailwind`, `css-modules`, `vanilla-extract`, `postcss`, `none`.
   */
  '--styling <value>'?: string

  /**
   * Sets the URL structure to support multiple markets. Must be one of: `subfolders`, `domains`, `subdomains`, `none`. Example: `--markets subfolders`.
   */
  '--markets <value>'?: string

  /**
   * Creates a global h2 shortcut for Shopify CLI using shell aliases. Deactivate with `--no-shortcut`.
   */
  '--shortcut'?: ''

  /**
   * Generate routes for all pages.
   */
  '--routes'?: ''

  /**
   * Init Git and create initial commits.
   */
  '--git'?: ''

  /**
   * Scaffolds a new Hydrogen project with a set of sensible defaults. Equivalent to `shopify hydrogen init --path hydrogen-quickstart --mock-shop --language js --shortcut --routes --markets none`
   */
  '--quickstart'?: ''
}
