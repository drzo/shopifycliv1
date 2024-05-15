import {ui} from '@shopify/cli-kit'
import {generateRandomNameForSubdirectory} from '@shopify/cli-kit/node/fs'

interface InitOptions {
  name?: string
  directory: string
}

interface InitOutput {
  name: string
}

const init = async (options: InitOptions, prompt = ui.prompt): Promise<InitOutput> => {
  const defaults = {
    name: await generateRandomNameForSubdirectory({suffix: 'app', directory: options.directory}),
  } as const

  const questions: ui.Question<'name'>[] = []
  if (!options.name) {
    questions.push({
      type: 'input',
      name: 'name',
      preface: '\nWelcome. Let’s get started by naming your app. You can change it later.',
      message: "Your app's name?",
      default: defaults.name,
      validate: (value) => {
        if (value.length === 0) {
          return "App Name can't be empty"
        }
        if (value.length > 30) {
          return 'Enter a shorter name (30 character max.)'
        }
        return true
      },
    })
  }

  const promptOutput: InitOutput = await prompt(questions)
  const answers = {
    ...options,
    ...promptOutput,
  }

  return answers
}

export default init
