/**
 * IMPORTANT: Do not modify this file.
 *
 * This file is generated by the `pnpm run schema:generate` command and should
 * not be modified.
 *
 * Any changes to the schemas for `update_extension` files require the creation
 * of a new schema file at `https://github.com/Shopify/theme-liquid-docs`.
 *
 * This is necessary because Shopify must support legacy `update_extension.json`
 * scripts. Once a new schema is published, it must be supported forever without
 * breaking backward compatibility.
 */
import {zod as z} from '@shopify/cli-kit/node/schema'

export const schemaUrlV1 =
  'https://raw.githubusercontent.com/Shopify/theme-liquid-docs/main/schemas/update/update_extension_schema_v1.json'

export const schemaV1 = z
  .object({
    $schema: z.string().describe('The URL for the JSON schema version used for validation and execution.'),
    theme_name: z.string().describe('The name of the theme to which the update extension script applies.'),
    theme_version: z.string().describe('The version of the theme to which the update extension script applies.'),
    operations: z
      .array(
        z
          .object({
            id: z.string(),
            actions: z
              .array(
                z.union([
                  z
                    .object({
                      action: z.literal('move').describe('The action type.'),
                      file: z
                        .any()
                        .superRefine((x, ctx) => {
                          const schemas = [
                            z
                              .string()
                              .describe(
                                'The relative path of the file, within the theme folder, to move the key-value pair.',
                              ),
                            z.object({
                              source: z.string().describe('The relative path of source file.'),
                              target: z.string().describe('The relative path of target file.'),
                            }),
                          ]
                          const errors = schemas.reduce(
                            (errors: z.ZodError[], schema) =>
                              ((result) => ('error' in result ? [...errors, result.error] : errors))(
                                schema.safeParse(x),
                              ),
                            [],
                          )
                          if (schemas.length - errors.length !== 1) {
                            ctx.addIssue({
                              path: ctx.path,
                              code: 'invalid_union',
                              unionErrors: errors,
                              message: 'Invalid input: Should pass single schema',
                            })
                          }
                        })
                        .describe(
                          "The file referenced in this step can be either a string, if the source and target are the same, or an object with 'source' and 'target' properties.",
                        ),
                      from_key: z.string().describe('The key to move from.'),
                      to_key: z.string().describe('The key to move to.'),
                    })
                    .strict(),
                  z
                    .object({
                      action: z.literal('copy').describe('The action type.'),
                      file: z
                        .any()
                        .superRefine((x, ctx) => {
                          const schemas = [
                            z.string().describe('The relative path of the file to copy the key-value pair.'),
                            z.object({
                              source: z.string().describe('The relative path of source file.'),
                              target: z.string().describe('The relative path of target file.'),
                            }),
                          ]
                          const errors = schemas.reduce(
                            (errors: z.ZodError[], schema) =>
                              ((result) => ('error' in result ? [...errors, result.error] : errors))(
                                schema.safeParse(x),
                              ),
                            [],
                          )
                          if (schemas.length - errors.length !== 1) {
                            ctx.addIssue({
                              path: ctx.path,
                              code: 'invalid_union',
                              unionErrors: errors,
                              message: 'Invalid input: Should pass single schema',
                            })
                          }
                        })
                        .describe(
                          "The file referenced in this step can be either a string, if the source and target are the same, or an object with 'source' and 'target' properties.",
                        ),
                      from_key: z.string().describe('The key to copy from.'),
                      to_key: z.string().describe('The key to copy to.'),
                    })
                    .strict(),
                  z
                    .object({
                      action: z.literal('add').describe('The action type.'),
                      file: z.string().describe('The relative path of the file to add the key-value pair to.'),
                      key: z.string().describe('The existing key to add the value to.'),
                      value: z
                        .any()
                        .superRefine((x, ctx) => {
                          const schemas = [z.record(z.any()), z.array(z.any())]
                          const errors = schemas.reduce(
                            (errors: z.ZodError[], schema) =>
                              ((result) => ('error' in result ? [...errors, result.error] : errors))(
                                schema.safeParse(x),
                              ),
                            [],
                          )
                          if (schemas.length - errors.length !== 1) {
                            ctx.addIssue({
                              path: ctx.path,
                              code: 'invalid_union',
                              unionErrors: errors,
                              message: 'Invalid input: Should pass single schema',
                            })
                          }
                        })
                        .describe('The value to add, either as an object or an array.'),
                    })
                    .strict(),
                  z
                    .object({
                      action: z.literal('delete').describe('The action type.'),
                      file: z.string().describe('The relative path of the file to delete the key-value pair from.'),
                      key: z.string().describe('The key to delete.'),
                      value: z.string().describe('The optional value to delete in the key.').optional(),
                    })
                    .strict(),
                ]),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1)
      .describe('An array of operations to be performed on the theme during an update.'),
  })
  .strict()
