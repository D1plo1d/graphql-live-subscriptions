import { compare as jsonPatchCompare } from 'fast-json-patch'

import {
  parse,
  execute,
  GraphQLSchema,
  introspectionQuery,
  GraphQLObjectType,
} from 'graphql'

const queryExecutor = ({ context, resolveInfo, type, fieldName }) => {
if (fieldName == null) {
  throw new Error('fieldName cannot be null')
}

  /*
   * build a query for the query node that can be executed on state change
   * in order to create query diffs
   */
  const rootField = resolveInfo.fieldNodes[0]

  const buildArgumentString = argumentNode => {
    if (argumentNode.name == null || argumentNode.name.value == null) {
      throw new Error('argument name cannot be null')
    }
    const name = argumentNode.name.value;
    const valueNode = argumentNode.value
    if (valueNode.kind === 'Variable') {
      const value = resolveInfo.variableValues[valueNode.name.value]
      return `${name}: ${JSON.stringify(value)}`
    } else {
      return `${name}: ${valueNode.value}`
    }
  }

  const buildQueryFromFieldNode = fieldNode => {
    const { kind } = fieldNode
    let fieldString
    if (kind === 'InlineFragment') {
      fieldString = `... on ${fieldNode.typeCondition.name.value}`
    } else if (kind === 'FragmentSpread') {
      return `... ${fieldNode.name.value}`
    } else if (kind === 'FragmentDefinition') {
      fieldString = (
        `fragment ${fieldNode.name.value} on `+
        `${fieldNode.typeCondition.name.value}`
      )
    } else if (kind === 'Field') {
      const name = fieldNode.name.value

      const args = fieldNode.arguments.map(buildArgumentString)
      const argsString = args.length === 0 ? '' : `(${args.join(', ')})`

      fieldString = `${name}${argsString}`
    }
    else {
      throw new Error(`Unknown kind: ${kind}`)
    }

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

  let queryString = buildQueryFromFieldNode(rootField)
  queryString = `query {\n  ${queryString.replace(/\n/g, `\n  `)}\n}`

  for (const fragment of Object.values(resolveInfo.fragments)) {
    const fragmentString = buildQueryFromFieldNode(fragment)
    queryString = `${queryString}\n${fragmentString}`
  }

  const documentAST = parse(queryString)
  const querySchema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'LiveDataQuerySchemaRoot',
      fields: () => ({
        [fieldName]: {
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
        [fieldName]: {
          query: state,
        },
      },
      context,
    )
    if (errors) throw new Error(errors[0])
    return data[fieldName].query
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
