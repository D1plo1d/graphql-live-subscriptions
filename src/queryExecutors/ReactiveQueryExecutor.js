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

const createPatch = (reactiveNode, source) => {
  const value = ReactiveNode.getNextValueOrUnchanged(reactiveNode, source)

  console.log(reactiveNode.name, reactiveNode.type, value === ReactiveNode.UNCHANGED)
  if (value === ReactiveNode.UNCHANGED) {
    return []
  }
  if (reactiveNode.isLeaf) {
    console.log('CHANGE', reactiveNode.name, source, value)
    return [{
      op: 'replace',
      value,
      path: reactiveNode.patchPath,
    }]
  }

  // console.log(reactiveNode.name, reactiveNode.children)
  const childPatches = reactiveNode.children.map((childNode, index) => {
    const childSource = reactiveNode.isList ? value[index] : value
    // console.log(index, reactiveNode.isList, key, value[key])

    const childPatch = createPatch(childNode, childSource)

    // console.log(childNode.patchPath, value, childNode.value)
    // console.log(childNode.patchPath, value)
    return childPatch
  })
  console.log([].concat(...childPatches))

  return [].concat(...childPatches)
}

const ReactiveQueryExecutor = ({
  context,
  resolveInfo,
  fieldName,
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
