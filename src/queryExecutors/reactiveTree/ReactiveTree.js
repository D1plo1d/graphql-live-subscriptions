import {
  isLeafType,
  isObjectType,
  // isAbstractType,
  isListType,
  isNonNullType,
} from 'graphql'
import {
  collectFields,
  getFieldDef,
  addPath,
} from 'graphql/execution/execute'

import * as ReactiveNode from './ReactiveNode'

const createReactiveTreeInner = ({
  exeContext,
  parentType,
  fieldDef,
  fieldNodes,
  path,
  source,
}) => {
  const { schema } = exeContext
  const { selectionSet } = fieldNodes[0]

  const reactiveNode = ReactiveNode.createNode({
    exeContext,
    parentType,
    fieldDef,
    fieldNode: fieldNodes[0],
    path,
    children: [],
  })
  const resolverResult = ReactiveNode.setInitialValue(reactiveNode, source)

  debugger

  if (isLeafType(fieldDef.type)) {
    return []
  } else if (isListType(fieldDef.type)) {
    reactiveNode.children = (resolverResult || [])
      .map((sourceForArrayIndex, index) => createReactiveTreeInner({
        exeContext,
        parentType: fieldDef.type,
        fieldDef: null, // TODO
        path: addPath(path, index),
        source: sourceForArrayIndex,
      }))

    return reactiveNode
  } else if (isNonNullType(fieldDef.type)) {
    return createReactiveTreeInner({
      exeContext,
      parentType: fieldDef.type,
      fieldDef: fieldDef.type.ofType, // TODO
      path,
      source,
    })
  } else if (isObjectType(fieldDef.type)) {
    const fields = collectFields(
      exeContext,
      fieldDef.type,
      selectionSet,
      Object.create(null),
      Object.create(null),
    )

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
        fieldDef.type,
        childFieldNodes[0].name.value,
      )
      const childPath = addPath(path, childResponseName)

      const childReactiveNode = createReactiveTreeInner({
        exeContext,
        parentType: fieldDef.type,
        fieldDef: childFieldDef,
        fieldNodes: childFieldNodes,
        path: childPath,
        source: resolverResult,
      })

      reactiveNode.children.push(childReactiveNode)
    })

    return reactiveNode
  }
  throw new Error(`unsupported GraphQL type: ${parentType}`)
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
  const { selectionSet } = operation
  const rootFields = collectFields(
    exeContext,
    rootType,
    selectionSet,
    Object.create(null),
    Object.create(null),
  )

  const liveDataType = rootType.getFields()[subscriptionName].type
  const liveDataSelectionSet = rootFields[subscriptionName][0].selectionSet
  const liveDataFields = collectFields(
    exeContext,
    liveDataType,
    liveDataSelectionSet,
    Object.create(null),
    Object.create(null),
  )

  const queryFieldDef = liveDataType.getFields().query
  const queryFieldNodes = liveDataFields.query

  // TODO: recurse down to the LiveData `query` field

  let path
  path = addPath(undefined, subscriptionName)
  path = addPath(path, 'query')

  return createReactiveTreeInner({
    exeContext,
    parentType: liveDataType,
    fieldDef: queryFieldDef,
    fieldNodes: queryFieldNodes,
    path,
    source: { query: source },
  })
}

export default ReactiveTree
