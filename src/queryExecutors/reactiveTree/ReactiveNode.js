import {
  isListType,
  isLeafType,
  responsePathAsArray,
} from 'graphql'
import {
  getFieldDef,
  buildResolveInfo,
  resolveFieldValueOrError,
  addPath,
} from 'graphql/execution/execute'

import { createReactiveTreeInner } from './ReactiveTree'

export const UNCHANGED = Symbol('UNCHANGED')

export const createNode = ({
  exeContext,
  parentType,
  type,
  fieldNodes,
  graphqlPath,
  children,
  sourceRootConfig,
  isSourceRoot,
}) => {
  const reactiveNode = {
    isLeaf: isLeafType(type),
    isList: isListType(type),
    isListEntry: isListType(parentType),
    name: fieldNodes[0].name.value,
    // eg. if path is ['live', 'query', 'foo'] then patchPath is '/foo'
    patchPath: `/${responsePathAsArray(graphqlPath).slice(2).join('/')}`,
    children,
    value: undefined,
    exeContext,
    parentType,
    type,
    fieldNodes,
    sourceRootConfig,
    isSourceRoot,
    graphqlPath,
  }
  return reactiveNode
}

const removeAllSourceRoots = (reactiveNode, sourceRootConfig) => {
  if (reactiveNode.isSourceRoot) {
    // eslint-disable-next-line no-param-reassign
    delete sourceRootConfig[reactiveNode.parentType.name][reactiveNode.name]
  }
  reactiveNode.children.forEach((childNode) => {
    removeAllSourceRoots(childNode, sourceRootConfig)
  })
}

/**
 * Resolves the field on the given source object. In particular, this
 * figures out the value that the field returns by calling its resolve function,
 * then calls completeValue to complete promises, serialize scalars, or execute
 * the sub-selection-set for objects.
 */
const resolveField = (reactiveNode, source) => {
  const {
    exeContext,
    parentType,
    fieldNodes,
    graphqlPath,
  } = reactiveNode

  const fieldName = fieldNodes[0].name.value

  if (reactiveNode.isListEntry) return source

  const fieldDef = getFieldDef(exeContext.schema, parentType, fieldName)
  if (!fieldDef) {
    return null
  }

  const resolveFn = fieldDef.resolve || exeContext.fieldResolver

  const info = buildResolveInfo(
    exeContext,
    fieldDef,
    fieldNodes,
    parentType,
    graphqlPath,
  )

  // Get the resolve function, regardless of if its result is normal
  // or abrupt (error).
  const result = resolveFieldValueOrError(
    exeContext,
    fieldDef,
    fieldNodes,
    resolveFn,
    source,
    info,
  )

  return result[fieldName]
}

export const setInitialValue = (reactiveNode, source) => {
  // eslint-disable-next-line no-param-reassign
  reactiveNode.value = resolveField(reactiveNode, source)
  return reactiveNode.value
}

export const getNextValueOrUnchanged = (reactiveNode, source) => {
  const previousValue = reactiveNode.value
  const nextValue = resolveField(reactiveNode, source)

  if (nextValue === previousValue) return UNCHANGED

  if (reactiveNode.isList) {
    /*
     * Add or remove nodes and source roots if the list has changed length
     */
    const lengthOf = val => (val && val.length) || 0
    const listHasGrown = lengthOf(nextValue) > lengthOf(previousValue)
    const listHasShrunk = lengthOf(nextValue) < lengthOf(previousValue)

    if (listHasGrown) {
      const {
        exeContext,
        fieldNodes,
        sourceRootConfig,
        graphqlPath,
      } = reactiveNode
      const previousLength = lengthOf(previousValue)
      const addedEntries = nextValue.splice(previousLength)

      const newChildNodes = addedEntries.map((entry, index) => (
        createReactiveTreeInner({
          exeContext,
          parentType: reactiveNode.type,
          type: reactiveNode.type.ofType,
          fieldNodes,
          graphqlPath: addPath(graphqlPath, previousLength + index),
          source,
          sourceRootConfig,
        })
      ))

      reactiveNode.children.push(newChildNodes)
    } else if (listHasShrunk) {
      const nextLength = lengthOf(nextValue)
      const removedNodes = reactiveNode.children.splice(nextLength)
      const { sourceRootConfig } = reactiveNode

      removedNodes.forEach(node => removeAllSourceRoots(node, sourceRootConfig))

      // eslint-disable-next-line no-param-reassign
      reactiveNode.children = reactiveNode.children.splice(0, nextLength)
    }
  }

  // eslint-disable-next-line no-param-reassign
  reactiveNode.value = nextValue

  return nextValue
}
