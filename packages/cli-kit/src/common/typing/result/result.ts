/* eslint-disable id-length */
/* eslint-disable @typescript-eslint/naming-convention */
import {ResultAsync, errAsync} from './result-async.js'
import {
  InferOkTypes,
  InferErrTypes,
  ExtractOkTypes,
  ExtractErrTypes,
  combineResultList,
  combineResultListWithAllErrors,
} from './_internals/utils'
import {createNeverThrowError, ErrorConfig} from './_internals/error'

export namespace Result {
  /**
   * Wraps a function with a try catch, creating a new function with the same
   * arguments but returning `Ok` if successful, `Err` if the function throws
   *
   * @param fn function to wrap with ok on success or err on failure
   * @param errorFn when an error is thrown, this will wrap the error result if provided
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function fromThrowable<TFn extends (...args: ReadonlyArray<any>) => any, E>(
    fn: TFn,
    errorFn?: (e: unknown) => E,
  ): (...args: Parameters<TFn>) => Result<ReturnType<TFn>, E> {
    return (...args) => {
      try {
        const result = fn(...args)
        return ok(result)
        // eslint-disable-next-line no-catch-all/no-catch-all
      } catch (error) {
        return err(errorFn ? (errorFn(error) as E) : (error as E))
      }
    }
  }

  export function combine<TResults extends ReadonlyArray<Result<unknown, unknown>>>(
    resultList: TResults,
  ): Result<ExtractOkTypes<TResults>, ExtractErrTypes<TResults>[number]> {
    return combineResultList(resultList) as Result<ExtractOkTypes<TResults>, ExtractErrTypes<TResults>[number]>
  }

  export function combineWithAllErrors<TResults extends ReadonlyArray<Result<unknown, unknown>>>(
    resultList: TResults,
  ): Result<ExtractOkTypes<TResults>, ExtractErrTypes<TResults>[number][]> {
    return combineResultListWithAllErrors(resultList) as Result<
      ExtractOkTypes<TResults>,
      ExtractErrTypes<TResults>[number][]
    >
  }
}

export type Result<T, E> = Ok<T, E> | Err<T, E>

export const ok = <T, E = never>(value: T): Ok<T, E> => new Ok(value)

export const err = <T = never, E = unknown>(err: E): Err<T, E> => new Err(err)

interface IResult<T, E> {
  /**
   * Used to check if a `Result` is an `OK`
   *
   * @returns `true` if the result is an `OK` variant of Result
   */
  isOk(): this is Ok<T, E>

  /**
   * Used to check if a `Result` is an `Err`
   *
   * @returns `true` if the result is an `Err` variant of Result
   */
  isErr(): this is Err<T, E>

  /**
   * Maps a `Result<T, E>` to `Result<U, E>`
   * by applying a function to a contained `Ok` value, leaving an `Err` value
   * untouched.
   *
   * @param f The function to apply an `OK` value
   * @returns the result of applying `f` or an `Err` untouched
   */
  map<U>(f: (t: T) => U): Result<U, E>

  /**
   * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a
   * contained `Err` value, leaving an `Ok` value untouched.
   *
   * This function can be used to pass through a successful result while
   * handling an error.
   *
   * @param f a function to apply to the error `Err` value
   */
  mapErr<F>(f: (e: E) => F): Result<T, F>

  /**
   * Similar to `map` Except you must return a new `Result`.
   *
   * This is useful for when you need to do a subsequent computation using the
   * inner `T` value, but that computation might fail.
   * Additionally, `andThen` is really useful as a tool to flatten a
   * `Result<Result<A, E2>, E1>` into a `Result<A, E2>` (see example below).
   *
   * @param f The function to apply to the current value
   */
  andThen<TMappedResult extends Result<unknown, unknown>>(
    f: (t: T) => TMappedResult,
  ): Result<InferOkTypes<TMappedResult>, InferErrTypes<TMappedResult> | E>
  andThen<U, F>(f: (t: T) => Result<U, F>): Result<U, E | F>

  /**
   * Takes an `Err` value and maps it to a `Result<T, SomeNewType>`.
   *
   * This is useful for error recovery.
   *
   *
   * @param f  A function to apply to an `Err` value, leaving `Ok` values
   * untouched.
   */
  orElse<R extends Result<unknown, unknown>>(f: (e: E) => R): Result<T, InferErrTypes<R>>
  orElse<A>(f: (e: E) => Result<T, A>): Result<T, A>

  /**
   * Similar to `map` Except you must return a new `Result`.
   *
   * This is useful for when you need to do a subsequent async computation using
   * the inner `T` value, but that computation might fail. Must return a ResultAsync
   *
   * @param f The function that returns a `ResultAsync` to apply to the current
   * value
   */
  asyncAndThen<U, F>(f: (t: T) => ResultAsync<U, F>): ResultAsync<U, E | F>

  /**
   * Maps a `Result<T, E>` to `ResultAsync<U, E>`
   * by applying an async function to a contained `Ok` value, leaving an `Err`
   * value untouched.
   *
   * @param f An async function to apply an `OK` value
   */
  asyncMap<U>(f: (t: T) => Promise<U>): ResultAsync<U, E>

  /**
   * Unwrap the `Ok` value, or return the default if there is an `Err`
   *
   * @param v the default value to return if there is an `Err`
   */
  unwrapOr<A>(v: A): T | A

  /**
   * Unwrap the `Ok` value, or throw an exception if there is an `Err`
   */
  unwrapOrThrow(): T
  /**
   *
   * Given 2 functions (one for the `Ok` variant and one for the `Err` variant)
   * execute the function that matches the `Result` variant.
   *
   * Match callbacks do not necessitate to return a `Result`, however you can
   * return a `Result` if you want to.
   *
   * `match` is like chaining `map` and `mapErr`, with the distinction that
   * with `match` both functions must have the same return type.
   *
   * @param ok
   * @param err
   */
  match<A>(ok: (t: T) => A, err: (e: E) => A): A

  /**
   * **This method is unsafe, and should only be used in a test environments**
   *
   * Takes a `Result<T, E>` and returns a `T` when the result is an `Ok`, otherwise it throws a custom object.
   *
   * @param config
   */
  _unsafeUnwrap(config?: ErrorConfig): T

  /**
   * **This method is unsafe, and should only be used in a test environments**
   *
   * takes a `Result<T, E>` and returns a `E` when the result is an `Err`,
   * otherwise it throws a custom object.
   *
   * @param config
   */
  _unsafeUnwrapErr(config?: ErrorConfig): E
}

export class Ok<T, E> implements IResult<T, E> {
  constructor(readonly value: T) {}

  isOk(): this is Ok<T, E> {
    return true
  }

  isErr(): this is Err<T, E> {
    return !this.isOk()
  }

  map<A>(f: (t: T) => A): Result<A, E> {
    return ok(f(this.value))
  }

  mapErr<U>(_f: (e: E) => U): Result<T, U> {
    return ok(this.value)
  }

  andThen<R extends Result<unknown, unknown>>(f: (t: T) => R): Result<InferOkTypes<R>, InferErrTypes<R> | E>

  andThen<U, F>(f: (t: T) => Result<U, F>): Result<U, E | F>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  andThen(f: any): any {
    return f(this.value)
  }

  orElse<R extends Result<unknown, unknown>>(_f: (e: E) => R): Result<T, InferErrTypes<R>>
  orElse<A>(_f: (e: E) => Result<T, A>): Result<T, A>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orElse(_f: any): any {
    return ok(this.value)
  }

  asyncAndThen<U, F>(f: (t: T) => ResultAsync<U, F>): ResultAsync<U, E | F> {
    return f(this.value)
  }

  asyncMap<U>(f: (t: T) => Promise<U>): ResultAsync<U, E> {
    return ResultAsync.fromSafePromise(f(this.value))
  }

  unwrapOr<A>(_v: A): T | A {
    return this.value
  }

  unwrapOrThrow(): T {
    return this.value
  }

  match<A>(ok: (t: T) => A, _err: (e: E) => A): A {
    return ok(this.value)
  }

  _unsafeUnwrap(_?: ErrorConfig): T {
    return this.value
  }

  _unsafeUnwrapErr(config?: ErrorConfig): E {
    throw createNeverThrowError('Called `_unsafeUnwrapErr` on an Ok', this, config)
  }
}

export class Err<T, E> implements IResult<T, E> {
  // eslint-disable-next-line node/handle-callback-err
  constructor(readonly error: E) {}

  isOk(): this is Ok<T, E> {
    return false
  }

  isErr(): this is Err<T, E> {
    return !this.isOk()
  }

  map<A>(_f: (t: T) => A): Result<A, E> {
    return err(this.error)
  }

  mapErr<U>(f: (e: E) => U): Result<T, U> {
    return err(f(this.error))
  }

  andThen<R extends Result<unknown, unknown>>(_f: (t: T) => R): Result<InferOkTypes<R>, InferErrTypes<R> | E>

  andThen<U, F>(_f: (t: T) => Result<U, F>): Result<U, E | F>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  andThen(_f: any): any {
    return err(this.error)
  }

  orElse<R extends Result<unknown, unknown>>(f: (e: E) => R): Result<T, InferErrTypes<R>>
  orElse<A>(f: (e: E) => Result<T, A>): Result<T, A>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orElse(f: any): any {
    return f(this.error)
  }

  asyncAndThen<U, F>(_f: (t: T) => ResultAsync<U, F>): ResultAsync<U, E | F> {
    return errAsync<U, E>(this.error)
  }

  asyncMap<U>(_f: (t: T) => Promise<U>): ResultAsync<U, E> {
    return errAsync<U, E>(this.error)
  }

  unwrapOr<A>(v: A): T | A {
    return v
  }

  unwrapOrThrow(): T {
    if (this.error instanceof Error) {
      throw this.error
    } else if (typeof this.error === 'string' && (this.error as string).trim().length !== 0) {
      throw new Error(this.error)
    } else {
      throw new Error('Unknown error')
    }
  }

  match<A>(_ok: (t: T) => A, err: (e: E) => A): A {
    return err(this.error)
  }

  _unsafeUnwrap(config?: ErrorConfig): T {
    throw createNeverThrowError('Called `_unsafeUnwrap` on an Err', this, config)
  }

  _unsafeUnwrapErr(_?: ErrorConfig): E {
    return this.error
  }
}

export const fromThrowable = Result.fromThrowable
