import { addPath } from 'graphql/execution/execute'
import collectSubFields from '../util/collectSubFields'

import * as ReactiveNode from './ReactiveNode'

export const createReactiveTreeInner = (opts) => {
  const {
    exeContext,
    parentType,
    type,
    fieldNodes,
    graphqlPath,
    sourceRootConfig,
  } = opts

  const reactiveNode = ReactiveNode.createNode({
    exeContext,
    parentType,
    type,
    fieldNodes,
    graphqlPath,
    children: [],
    sourceRootConfig,
  })

  return reactiveNode
}

const ReactiveTree = ({
  exeContext,
  operation,
  subscriptionName = 'live',
  source,
  sourceRoots = {},
}) => {
  const { schema } = exeContext

  /*
   * TODO: this selection set lookup does not currently support aliases for
   * the subscription or the `query` field.
   */
  const rootType = schema.getSubscriptionType()

  const rootFields = collectSubFields({
    exeContext,
    returnType: rootType,
    fieldNodes: [operation],
  })

  const liveDataType = rootType.getFields()[subscriptionName].type

  const liveDataFields = collectSubFields({
    exeContext,
    returnType: liveDataType,
    fieldNodes: rootFields[subscriptionName],
  })

  const queryFieldDef = liveDataType.getFields().query

  let graphqlPath
  graphqlPath = addPath(undefined, subscriptionName)
  graphqlPath = addPath(graphqlPath, 'query')

  const sourceRootConfig = {}
  Object.entries(sourceRoots).forEach(([typeName, fieldName]) => {
    sourceRootConfig[typeName] = sourceRootConfig[typeName] || {}
    sourceRootConfig[typeName][fieldName] = {}
  })

  const queryRoot = createReactiveTreeInner({
    exeContext,
    parentType: liveDataType,
    type: queryFieldDef.type,
    fieldNodes: liveDataFields.query,
    graphqlPath,
    source: { query: source },
    sourceRootConfig,
  })

  return { queryRoot }
}

export default ReactiveTree
