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

const createReactiveTreeInner = (
  exeContext,
  parentType,
  selectionSet,
  path,
  source,
) => {
  const { schema } = exeContext

  if (isLeafType(parentType)) {
    return []

  } else if (isListType(parentType)) {
    if (source == null) return []

    const trees = source
      .map((sourceForArrayIndex, index) => createReactiveTreeInner(
        exeContext,
        parentType.ofType,
        selectionSet,
        addPath(path, index),
        sourceForArrayIndex,
      ))

    return [].concat(...trees)

  } else if (isNonNullType(parentType)) {
    return createReactiveTreeInner(
      exeContext,
      parentType.ofType,
      selectionSet,
      path,
      source,
    )
  } else if (isObjectType(parentType)) {
    const fields = collectFields(
      exeContext,
      parentType,
      selectionSet,
      Object.create(null),
      Object.create(null),
    )

    const reactiveTree = []

    /*
     * TODO: recurse down the query to find all fields that have explicitly
     * defined reactive entry points and create a checkForNewValue for each of
     * them.
     *
     * The checks will then be run on each state change and if a new new value
     * is present then the field and it's child fields are compared to their
     * previous values to generate a patch.
     */
    Object.entries(fields).forEach(([responseName, fieldNodes]) => {
      const fieldDef = getFieldDef(schema, parentType, fieldNodes[0].name.value)
      const fieldPath = addPath(path, responseName)

      const reactiveNode = ReactiveNode.createNode({
        exeContext,
        parentType,
        fieldDef,
        fieldNode: fieldNodes[0],
        path: fieldPath,
        children: [],
      })
      const resolverResult = ReactiveNode.setInitialValue(reactiveNode, source)

      reactiveNode.children = createReactiveTreeInner(
        exeContext,
        fieldDef.type,
        fieldNodes[0].selectionSet,
        fieldPath,
        resolverResult,
      )

      // TODO: lists, nonNulls and abstract types

      reactiveTree.push(reactiveNode)
    })

    return reactiveTree
  } else {
    throw new Error(`unsupported GraphQL type: ${parentType}`)
  }
}

const ReactiveTree = ({
  exeContext,
  operation,
  subscriptionName = 'live',
  source,
}) => {
  const { schema } = exeContext
  const { selectionSet } = operation

  const rootType = schema.getSubscriptionType()

  // TODO: recurse down to the LiveData `query` field

  let path
  path = addPath(undefined, subscriptionName)
  path = addPath(path, 'query')

  return createReactiveTreeInner(
    exeContext,
    rootType,
    selectionSet,
    path,
    source,
  )
}

export default ReactiveTree
