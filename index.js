const fs = require('node:fs')
const assert = require('node:assert')
/**
 * @typedef CommandInstruction
 * @property {String} type
 * @property {String} value
 */

/**
 * @typedef CommandNode
 * @property {CommandInstruction[]} instructions
 * @property {CommandNode[]} children
 */

function buildStack() {
  const stack = []

  const push = (item) => stack.push(item)
  const pop = () => stack.pop()
  const peek = () => stack.length ? stack[stack.length - 1] : null

  return {
    push,
    pop,
    peek,
  }
}


function tokenize(data) {
  let output = ''
  const tokens = []
  let position = 0
  while(position < data.length) {

    const regexBlank = /\s/
    if(regexBlank.test(data[position])) {
      while(regexBlank.test(data[++position])) {}
    }
    

    if(data[position] === '{') {
      tokens.push({
        type: 'OPEN'
      })
      position++
    }
    
    if(data[position] === '}') {
      tokens.push({
        type: 'CLOSE'
      })
      position++
    }

    if(data[position] === '|') {
      tokens.push({
        type: 'PIPE'
      })
      position++
    }

    const regexWord = /[A-Za-z0-9\_]/
    if(regexWord.test(data[position])) {
      let word = data[position]
      while(regexWord.test(data[++position])) {
        if(data[position] === undefined) {
          break
        }
        word += data[position]
      }
      if(word !== undefined) {
        tokens.push({
          type: 'WORD',
          value: word,
        })
      }
    }


    if(data[position] === '?') {
      tokens.push({
        type: 'OPTIONAL'
      })
      position++
    }

    if(data[position] === ':') {
      tokens.push({
        type: 'ASSIGN'
      })
      position++
    }

    if(data[position] === '/' && data[position + 1] === '/') {
      let comment = data[position]
      while(data[++position] !== '\n') {
        comment += data[position]
      }

      tokens.push({
        type: 'COMMENT',
        value: comment,
      })
    }

    if(data[position] === '/' && data[position + 1] === '*') {
      let comment = data[position]
      while(!(data[position] === '*' && data[position + 1] === '/')) {
        position++
        comment += data[position]
      }
      comment += data[++position]
      position++
      tokens.push({
        type: 'COMMENT',
        value: comment,
      })
    }

    for(const stringType of ['"', "'", '`']) {
      if(data[position] === stringType) {
        let str = ''
        while(data[++position] !== stringType) {
          str += data[position]
        }
  
        tokens.push({
          type: 'STRING',
          value: str,
        })
      }
    }

    output += data[position]
    position++
  }

  return tokens
}

function * iterateInstructions(tokens) {
  const breakWords = ['OPEN', 'CLOSE']
  let index = 0
  let context = []
  while(index < tokens.length) {
    const stopAction = breakWords.find(i => i === tokens[index].type)
    if(stopAction) {
      yield {
        context,
        action: stopAction,
      }
      context = []
    } else {
      context.push(tokens[index])
    }
    index++
  }

  if(context.length) {
    throw new Error('Non closed scope')
  }
}

/**
 * 
 * @param {*} tokens 
 * @returns CommandNode
 */
function parser(tokens) {
  const root = []
  const nodeStack = buildStack()
  const intructionsIterator = iterateInstructions(tokens)
  let openContexts = 0
  for(const currentInstruction of intructionsIterator) {
    let currentNode = nodeStack.peek()

    if(openContexts === 0) {
      currentNode = {
        instructions: [],
        children: []
      }
      nodeStack.push(currentNode)

      // root has no parent node
      root.push(currentNode)
    }


    if(currentInstruction.action === 'OPEN') {
      openContexts++
      currentNode.instructions.push(...currentInstruction.context)
      const newNode = {
        instructions: [],
        children: [],
      }

      currentNode.children.push(newNode)
      nodeStack.push(newNode)
    } else if(currentInstruction.action === 'CLOSE') {
      openContexts--
      currentNode.instructions.push(...currentInstruction.context)
      nodeStack.pop()
    } else {
      currentNode.instructions.push(...currentInstruction.context)
    }
  }


  return {
    instructions: [],
    children: root,
  }
}


function commandIterator(instructions) {
  const instructionsIterator = instructions.values()

  return {
    next: () => instructionsIterator.next().value,
    nextWithoutComment: () => {
      let command = instructionsIterator.next()
      while(command?.value && command.value.type === 'COMMENT') {
        command = instructionsIterator.next()
      }

      return command?.value
    }
  }
}


/**
 * @param {CommandNode} commandNode 
 */
function interpreter(commandNode) {
  let scope
  let namespace
  let interface
  const variables = {
    required: [],
    optional: [],
  }

  const nodeStack = buildStack()
  nodeStack.push(commandNode)
  function processCommands() {
    const currentNode = nodeStack.pop()

    if(currentNode.instructions.length > 0) {
      const currentCommands = commandIterator(currentNode.instructions)
      const starterCommand = currentCommands.nextWithoutComment()
      if(starterCommand.value === 'declare') {
        scope = currentCommands.nextWithoutComment().value
      } else if(starterCommand.value === 'namespace') {
        namespace = currentCommands.nextWithoutComment().value
      } else if(starterCommand.value === 'interface') {
        interface = currentCommands.nextWithoutComment().value
      } else if (starterCommand.value === 'export') {

      } else {
        let previousWord = null
        for(let i=0; i < currentNode.instructions.length; i++) {
          const currentIntruction = currentNode.instructions[i]
          if(currentIntruction.type === 'ASSIGN') {
            const isRequired = currentNode.instructions[i - 1].type !== 'OPTIONAL'
            const variableName = previousWord.value
            if(isRequired) {
              variables.required.push(variableName)
            } else {
              variables.optional.push(variableName)
            }
          }

          if(['WORD', 'STRING'].includes(currentIntruction.type)) {
            previousWord = currentIntruction
          }
        }
      }
    }


    const childrenLength = currentNode.children.length
    if(childrenLength > 0) {
      for(let i = childrenLength - 1; i >= 0; i--) {
        nodeStack.push(currentNode.children[i])
      }
      processCommands()
    }
  }

  processCommands()

  return {
    scope,
    namespace,
    interface,
    variables,
  }
}


/**
 * Parse environment.d.ts and check the variables
 * @param {String} filename 
 */
function parserEnvironment(filename) {
  const data = String(fs.readFileSync(filename))
  const tokens = tokenize(data)
  const commandNode = parser(tokens)
  const interpreted = interpreter(commandNode)

  assert(interpreted.scope === 'global', 'Unknown scope')
  assert(interpreted.namespace === 'NodeJS', 'Unknown namespace')
  assert(interpreted.interface === 'ProcessEnv', 'Unknown interface')

  for(const required of interpreted.variables.required) {
    assert(process.env[required], `Variable '${required}' is required, no value was found`)
  }


  for(const optional of interpreted.variables.optional) {
    console.warn(`Variable '${optional}' is optional, and has no value`)
  }
}


module.exports = {
  parserEnvironment,
}