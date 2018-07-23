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

  const sourceRootConfig = {
    // all ReactiveNodes that are source roots in the current query in the order
    // that they are initially resolved which is the same order they will
    // be have patches resolved.
    nodes: [],
    // whitelist of fields that are to be added as source roots in the form
    // {typeName}.{fieldName}
    whitelist: {},
  }
  Object.entries(sourceRoots).forEach(([typeName, fieldNames]) => {
    fieldNames.forEach((fieldName) => {
      sourceRootConfig.whitelist[`${typeName}.${fieldName}`] = true
    })
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

  return {
    queryRoot,
    sourceRootConfig,
  }
}

export default ReactiveTree
