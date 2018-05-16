import {
  isLeafType,
  responsePathAsArray,
} from 'graphql'
import {
  getFieldDef,
  buildResolveInfo,
  resolveFieldValueOrError,
} from 'graphql/execution/execute'

const UNCHANGED = Symbol('UNCHANGED')

export const createNode = ({
  exeContext,
  parentType,
  fieldDef,
  fieldNode,
  path,
  children,
}) => {
  const reactiveNode = {
    isLeaf: isLeafType(fieldDef.type),
    name: fieldNode.name.value,
    // eg. if path is ['live', 'query', 'foo'] then patchPath is '/foo'
    patchPath: `/${responsePathAsArray(path).slice(2).join('/')}`,
    children,
    value: undefined,
    exeContext,
    parentType,
    fieldNode,
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
    fieldNode,
    graphqlPath,
  } = reactiveNode

  const fieldName = fieldNode.name.value
  console.log(fieldName, reactiveNode)

  const fieldDef = getFieldDef(exeContext.schema, parentType, fieldName)
  if (!fieldDef) {
    return null
  }

  const resolveFn = fieldDef.resolve || exeContext.fieldResolver

  const info = buildResolveInfo(
    exeContext,
    fieldDef,
    [fieldNode],
    parentType,
    graphqlPath,
  )

  // Get the resolve function, regardless of if its result is normal
  // or abrupt (error).
  const result = resolveFieldValueOrError(
    exeContext,
    fieldDef,
    [fieldNode],
    resolveFn,
    source,
    info,
  )

  return result
}

export const setInitialValue = (reactiveNode, source) => {
  // eslint-disable-next-line no-param-reassign
  reactiveNode.value = resolveField(reactiveNode, source)
  return reactiveNode.value
}

export const getNextValueOrUnchanged = (reactiveNode, source) => {
  const nextValue = resolveField(reactiveNode, source)

  // console.log(reactiveNode.value)
  if (nextValue === reactiveNode.value) return UNCHANGED

  // eslint-disable-next-line no-param-reassign
  // console.log(nextValue)
  // reactiveNode.value = nextValue
  return nextValue
}
