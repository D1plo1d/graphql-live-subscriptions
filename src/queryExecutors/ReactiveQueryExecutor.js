import executionContextFromInfo from './util/executionContextFromInfo'
import ReactiveTree from './reactiveTree/ReactiveTree'
import * as ReactiveNode from './reactiveTree/ReactiveNode'

const createInitialQuery = (reactiveTree) => {
  const json = {}
  console.log('create initial query!!')

  reactiveTree.forEach((reactiveNode) => {
    if (reactiveNode.isLeaf) {
      console.log(reactiveNode.value)
      json[reactiveNode.nane] = reactiveNode.value
    } else {
      json[reactiveNode.name] = createInitialQuery(reactiveNode.children)
    }
  })
  console.log(JSON.stringify(json))

  return json
}

const createPatch = (reactiveTree, source) => {
  const ops = []
  const childPatches = []
  reactiveTree.forEach((reactiveNode) => {
    const value = ReactiveNode.getNextValueOrUnchanged(reactiveNode, source)

    // console.log(reactiveNode.patchPath, value, reactiveNode.value)
    if (value === ReactiveNode.UNCHANGED) return

    if (reactiveNode.isLeaf) {
      ops.push({
        op: 'replace',
        value,
        path: reactiveNode.path,
      })
    } else {
      const childPatch = createPatch(reactiveNode.children, reactiveNode.value)
      childPatches.push(childPatch)
    }
  })

  return ops.concat(...childPatches)
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
      return createInitialQuery(reactiveTree, data)
    },
    createPatch: async data => createPatch(reactiveTree, data),
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
