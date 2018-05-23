import {
  isListType,
  isLeafType,
  responsePathAsArray,
} from 'graphql'
import {
  getFieldDef,
  buildResolveInfo,
  resolveFieldValueOrError,
} from 'graphql/execution/execute'

export const UNCHANGED = Symbol('UNCHANGED')

export const createNode = ({
  exeContext,
  parentType,
  type,
  fieldNodes,
  path,
  children,
}) => {
  const reactiveNode = {
    isLeaf: isLeafType(type),
    isList: isListType(type),
    isListEntry: isListType(parentType),
    name: fieldNodes[0].name.value,
    // eg. if path is ['live', 'query', 'foo'] then patchPath is '/foo'
    patchPath: `/${responsePathAsArray(path).slice(2).join('/')}`,
    children,
    value: undefined,
    exeContext,
    parentType,
    type,
    fieldNodes,
    graphqlPath: path,
  }
  return reactiveNode
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
  // console.log(fieldName, result)

  return result[fieldName]
}

export const setInitialValue = (reactiveNode, source) => {
  // eslint-disable-next-line no-param-reassign
  reactiveNode.value = resolveField(reactiveNode, source)
  return reactiveNode.value
}

export const getNextValueOrUnchanged = (reactiveNode, source) => {
  const nextValue = resolveField(reactiveNode, source)

  // console.log(reactiveNode.name, nextValue)
  if (nextValue === reactiveNode.value) return UNCHANGED

  // eslint-disable-next-line no-param-reassign
  // console.log(nextValue)
  // reactiveNode.value = nextValue
  return nextValue
}
