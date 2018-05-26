import {
  isListType,
  isLeafType,
  responsePathAsArray,
  defaultFieldResolver,
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

const adjustListSize = (reactiveNode) => {
  /*
   * Add or remove nodes and source roots if the list has changed length
   */
  const { value, children } = reactiveNode

  const previousLength = children.length
  const nextLength = (value && (value.length || value.size)) || 0

  const listHasGrown = nextLength > previousLength
  const listHasShrunk = nextLength < previousLength

  if (listHasGrown) {
    const {
      exeContext,
      fieldNodes,
      sourceRootConfig,
      graphqlPath,
    } = reactiveNode

    let index = 0
    // eslint-disable-next-line no-restricted-syntax
    for (const entry of value) {
      if (index >= previousLength) {
        const childNode = createReactiveTreeInner({
          exeContext,
          parentType: reactiveNode.type,
          type: reactiveNode.type.ofType,
          fieldNodes,
          graphqlPath: addPath(graphqlPath, index),
          source: entry, // TODO: create a new node without setting it's source
          sourceRootConfig,
        })
        reactiveNode.children.push(childNode)
      }
      index += 1
    }

    console.log('NEW CHILDREN')
    console.log(reactiveNode.children)
    console.log('-----')
  } else if (listHasShrunk) {
    const removedNodes = reactiveNode.children.splice(nextLength)
    const { sourceRootConfig } = reactiveNode

    removedNodes.forEach(node => removeAllSourceRoots(node, sourceRootConfig))

    // eslint-disable-next-line no-param-reassign
    reactiveNode.children = reactiveNode.children.splice(0, nextLength)
  }
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

  // console.log('before', reactiveNode.patchPath, fieldNodes[0].name.value, source)
  if (reactiveNode.isListEntry) return source

  const fieldDef = getFieldDef(exeContext.schema, parentType, fieldName)
  if (!fieldDef) {
    return null
  }

  const resolveFn = fieldDef.resolve || defaultFieldResolver

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

  // console.log('after', fieldNodes[0].name.value, reactiveNode.patchPath, fieldDef.type, fieldDef.resolve ? result : (result && result[fieldName]))
  // return fieldDef.resolve ? result : (result && result[fieldName])
  return result
}

export const setInitialValue = (reactiveNode, source) => {
  // eslint-disable-next-line no-param-reassign
  reactiveNode.value = resolveField(reactiveNode, source)

  if (reactiveNode.isList) {
    adjustListSize(reactiveNode)
  }

  return reactiveNode.value
}

export const getNextValueOrUnchanged = (reactiveNode, source) => {
  const previousValue = reactiveNode.value
  const nextValue = resolveField(reactiveNode, source)

  if (nextValue === previousValue) return UNCHANGED

  // eslint-disable-next-line no-param-reassign
  reactiveNode.value = nextValue

  if (reactiveNode.isList) {
    adjustListSize(reactiveNode)
  }

  return nextValue
}
