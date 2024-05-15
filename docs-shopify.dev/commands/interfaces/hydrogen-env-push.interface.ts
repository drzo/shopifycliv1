// This is an autogenerated file. Don't edit this file manually.
export interface hydrogenenvpush {
  /**
   * Specifies the environment to perform the operation using its handle. Fetch the handle using the `env list` command.
   */
  '--env <value>'?: string

  /**
   * Path to an environment file to override existing environment variables for the selected environment. Defaults to the '.env' located in your project path `--path`.
   */
  '--env-file <value>'?: string

  /**
   * The path to the directory of the Hydrogen storefront. Defaults to the current directory where the command is run.
   */
  '--path <value>'?: string
}
