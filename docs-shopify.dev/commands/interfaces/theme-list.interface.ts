// This is an autogenerated file. Don't edit this file manually.
export interface themelist {
  /**
   * The environment to apply to the current command.
   * @environment SHOPIFY_FLAG_ENVIRONMENT
   */
  '-e, --environment <value>'?: string

  /**
   * Only list theme with the given ID.
   * @environment SHOPIFY_FLAG_ID
   */
  '--id <value>'?: string

  /**
   * Output the theme list as JSON.
   * @environment SHOPIFY_FLAG_JSON
   */
  '--json'?: ''

  /**
   * Only list themes that contain the given name.
   * @environment SHOPIFY_FLAG_NAME
   */
  '--name <value>'?: string

  /**
   * Disable color output.
   * @environment SHOPIFY_FLAG_NO_COLOR
   */
  '--no-color'?: ''

  /**
   * Password generated from the Theme Access app.
   * @environment SHOPIFY_CLI_THEME_TOKEN
   */
  '--password <value>'?: string

  /**
   * Only list themes with the given role.
   * @environment SHOPIFY_FLAG_ROLE
   */
  '--role <value>'?: string

  /**
   * Store URL. It can be the store prefix (johns-apparel) or the full myshopify.com URL (johns-apparel.myshopify.com, https://johns-apparel.myshopify.com).
   * @environment SHOPIFY_FLAG_STORE
   */
  '-s, --store <value>'?: string

  /**
   * Increase the verbosity of the logs.
   * @environment SHOPIFY_FLAG_VERBOSE
   */
  '--verbose'?: ''
}