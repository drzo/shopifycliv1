import {SelectInput, SelectInputProps, Item as SelectItem} from './SelectInput.js'
import {InfoTableProps} from './Prompts/InfoTable.js'
import {GitDiffProps} from './Prompts/GitDiff.js'
import {InfoMessageProps} from './Prompts/InfoMessage.js'
import {Message, PromptLayout} from './Prompts/PromptLayout.js'
import {AbortSignal} from '../../../../public/node/abort.js'
import usePrompt, {PromptState} from '../hooks/use-prompt.js'
import React, {ReactElement, useCallback} from 'react'
import {useApp} from 'ink'

export interface SelectPromptProps<T> {
  noUnmount?: boolean
  submitted?: T
  dimOnSubmitted?: boolean
  message: Message
  choices: SelectInputProps<T>['items']
  onSubmit: (value: T) => void
  infoTable?: InfoTableProps['table']
  gitDiff?: GitDiffProps['gitDiff']
  defaultValue?: T
  abortSignal?: AbortSignal
  infoMessage?: InfoMessageProps['message']
}

// eslint-disable-next-line react/function-component-definition
function SelectPrompt<T>({
  noUnmount,
  submitted,
  dimOnSubmitted,
  message,
  choices,
  infoTable,
  infoMessage,
  gitDiff,
  onSubmit,
  defaultValue,
  abortSignal,
}: React.PropsWithChildren<SelectPromptProps<T>>): ReactElement | null {
  if (choices.length === 0) {
    throw new Error('SelectPrompt requires at least one choice')
  }
  const {exit: unmountInk} = useApp()
  const {promptState, setPromptState, answer, setAnswer} = usePrompt<SelectItem<T> | undefined>({
    initialAnswer: undefined,
    submitted: choices.find(({value}) => value === submitted)
  })

  const submitAnswer = useCallback(
    (answer: SelectItem<T>) => {
      setAnswer(answer)
      setPromptState(PromptState.Submitted)
      if (!noUnmount) unmountInk()
      onSubmit(answer.value)
    },
    [setAnswer, setPromptState, unmountInk, onSubmit],
  )

  return (
    <PromptLayout
      message={message}
      dimOnSubmitted={dimOnSubmitted}
      state={promptState}
      submittedAnswerLabel={answer?.label}
      infoTable={infoTable}
      infoMessage={infoMessage}
      gitDiff={gitDiff}
      abortSignal={abortSignal}
      input={<SelectInput defaultValue={defaultValue} items={choices} onSubmit={submitAnswer} />}
    />
  )
}

export {SelectPrompt}
