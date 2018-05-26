import executionContextFromInfo from './util/executionContextFromInfo'
import ReactiveTree from './reactiveTree/ReactiveTree'
import * as ReactiveNode from './reactiveTree/ReactiveNode'

const createInitialQuery = (reactiveNode) => {
  const json = reactiveNode.isList ? [] : {}

  reactiveNode.children.forEach((childNode) => {
    const value = (() => {
      if (childNode.isLeaf || childNode.value == null) {
        return childNode.value
      }
      return createInitialQuery(childNode)
    })()
    if (reactiveNode.isList) {
      json.push(value)
    } else {
      json[childNode.name] = value
    }
  })

  return json
}

const createPatch = (reactiveNode, source, patch = []) => {
  // console.log('PATCH')
  // console.log(reactiveNode)
  const previousValue = reactiveNode.value
  const value = ReactiveNode.getNextValueOrUnchanged(reactiveNode, source)

  console.log(reactiveNode.patchPath, value)
  if (value === ReactiveNode.UNCHANGED) {
    return patch
  }
  if (reactiveNode.isLeaf) {
    patch.push({
      op: 'replace',
      value,
      path: reactiveNode.patchPath,
    })
    return patch
  }

  if (reactiveNode.isList) {
    let index = 0
    // Compatible with any Iterable
    // eslint-disable-next-line no-restricted-syntax
    for (const childSource of value) {
      const childNode = reactiveNode.children[index]
      createPatch(childNode, childSource, patch)

      index += 1
    }
  } else {
    reactiveNode.children.forEach((childNode, index) => {
      const childSource = reactiveNode.isList ? value[index] : value

      createPatch(childNode, childSource, patch)
    })
  }

  return patch
}

const ReactiveQueryExecutor = ({
  context,
  resolveInfo,
  fieldName,
  sourceRoots,
}) => {
  const exeContext = executionContextFromInfo(resolveInfo, context)

  let reactiveTree

  return {
    initialQuery: async (data) => {
      reactiveTree = ReactiveTree({
        exeContext,
        operation: resolveInfo.operation,
        subscriptionName: fieldName,
        source: data,
        sourceRoots,
      })
      return createInitialQuery(reactiveTree.queryRoot, data)
    },
    // TODO: create patches for all source roots once source roots are
    // implemented
    createPatch: async data => (
      createPatch(reactiveTree.queryRoot, { query: data })
    ),
    recordPatch: async () => {
      const message = (
        'recordPatch is not yet implemented for ReactiveQueryExecutor'
      )
      // eslint-disable-next-line no-console
      console.error(message)
      throw new Error(message)
    },
  }
}

export default ReactiveQueryExecutor
