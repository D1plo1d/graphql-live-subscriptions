import {
  isLeafType,
  isObjectType,
  // isAbstractType,
  isListType,
  isNonNullType,
} from 'graphql'
import {
  getFieldDef,
  addPath,
} from 'graphql/execution/execute'
import collectSubFields from '../util/collectSubFields'

import * as ReactiveNode from './ReactiveNode'

const createReactiveTreeInner = (opts) => {
  const {
    exeContext,
    parentType,
    type,
    fieldNodes,
    path,
    source,
  } = opts

  if (isNonNullType(type)) {
    return createReactiveTreeInner({
      ...opts,
      type: type.ofType,
    })
  }

  const { schema } = exeContext

  const reactiveNode = ReactiveNode.createNode({
    exeContext,
    parentType,
    type,
    fieldNodes,
    path,
    children: [],
  })
  const resolverResult = ReactiveNode.setInitialValue(reactiveNode, source)

  if (isListType(type)) {
    const resultList = (() => {
      if (resolverResult == null) {
        return []
      }
      if (resolverResult.map != null) {
        return resolverResult
      }
      return [resolverResult]
    })()
    reactiveNode.children = resultList.map((sourceForArrayIndex, index) => (
      createReactiveTreeInner({
        exeContext,
        parentType: type,
        type: type.ofType,
        fieldNodes,
        path: addPath(path, index),
        source: sourceForArrayIndex,
      })
    ))
  } else if (isObjectType(type)) {
    const fields = collectSubFields({
      exeContext,
      returnType: type,
      fieldNodes,
    })

    /*
     * TODO: recurse down the query to find all fields that have explicitly
     * defined reactive entry points and create a checkForNewValue for each of
     * them.
     *
     * The checks will then be run on each state change and if a new new value
     * is present then the field and it's child fields are compared to their
     * previous values to generate a patch.
     */
    Object.entries(fields).forEach(([childResponseName, childFieldNodes]) => {
      const childFieldDef = getFieldDef(
        schema,
        type,
        childFieldNodes[0].name.value,
      )
      const childPath = addPath(path, childResponseName)

      const childReactiveNode = createReactiveTreeInner({
        exeContext,
        parentType: type,
        type: childFieldDef.type,
        fieldNodes: childFieldNodes,
        path: childPath,
        source: resolverResult,
      })

      reactiveNode.children.push(childReactiveNode)
    })
  } else if (!isLeafType(type) && !isNonNullType(type)) {
    throw new Error(`unsupported GraphQL type: ${type}`)
  }

  return reactiveNode
}

const ReactiveTree = ({
  exeContext,
  operation,
  subscriptionName = 'live',
  source,
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

  let path
  path = addPath(undefined, subscriptionName)
  path = addPath(path, 'query')

  const queryRoot = createReactiveTreeInner({
    exeContext,
    parentType: liveDataType,
    type: queryFieldDef.type,
    fieldNodes: liveDataFields.query,
    path,
    source: { query: source },
  })

  return { queryRoot }
}

export default ReactiveTree
