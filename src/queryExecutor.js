import { compare as jsonPatchCompare } from 'fast-json-patch'

import {
  parse,
  execute,
  GraphQLSchema,
  introspectionQuery,
  GraphQLObjectType,
} from 'graphql'

const queryExecutor = ({ context, resolveInfo, type }) => {
  /*
   * build a query for the query node that can be executed on state change
   * in order to create query diffs
   */
  const rootField = resolveInfo.fieldNodes[0]

  const queryField = rootField
    .selectionSet
    .selections
    .find(selection => selection.name.value === 'query')

  const buildArgumentString = argumentNode => {
    const name = argumentNode.name.value
    const value = argumentNode.value.value
    return `${name}: ${value}`
  }

  const buildQueryFromFieldNode = fieldNode => {
    const name = fieldNode.name.value

    const args = fieldNode.arguments.map(buildArgumentString)
    const argsString = args.length === 0 ? '' : `(${args.join(', ')})`

    const fieldString = `${name}${argsString}`

    if (fieldNode.selectionSet == null) return fieldString

    const children = fieldNode
      .selectionSet
      .selections

    return (
      `${fieldString} {\n` +
        children.map(child =>
          `  ${ buildQueryFromFieldNode(child).replace(/\n/g, `\n  `) }\n`
        ).join('') +
      `}`
    )
  }

  const queryString = `
    query {
      ${buildQueryFromFieldNode(queryField)}
    }
  `

  const documentAST = parse(queryString)
  const querySchema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'LiveDataQuerySchemaRoot',
      fields: () => ({
        query: {
          type: typeof type === 'function' ? type() : type,
        },
      }),
    }),
  })

  const executeQuery = async state => {
    const { data, errors } = await execute(
      querySchema,
      documentAST,
      {
        query: state,
      },
      context,
    )
    if (errors) throw new Error(errors[0])
    return data.query
  }

  let previousState

  return {
    initialQuery: async state => previousState = await executeQuery(state),
    diff: async state => {
      const nextState = await executeQuery(state)
      const patches = jsonPatchCompare(previousState, nextState)
      previousState = nextState
      return patches
    },
  }
}

export default queryExecutor
