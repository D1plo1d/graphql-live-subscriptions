import executionContextFromInfo from './util/executionContextFromInfo'
import ReactiveTree from './reactiveTree/ReactiveTree'
import * as ReactiveNode from './reactiveTree/ReactiveNode'

const createInitialQuery = (reactiveTree) => {
  const json = {}

  reactiveTree.forEach((reactiveNode) => {
    if (reactiveNode.isLeaf) {
      json[reactiveNode.nane] = reactiveNode.value
    } else {
      json[reactiveNode.name] = createInitialQuery(reactiveNode.children)
    }
  })

  return json
}

const createPatch = (reactiveTree, source) => {
  const ops = []
  const childPatches = []
  reactiveTree.forEach((reactiveNode) => {
    const value = ReactiveNode.getNextValueOrUnchanged(reactiveNode, source)

    if (value === ReactiveNode.UNCHANGED) return

    if (reactiveNode.isLeaf) {
      ops.push({
        op: 'replace',
        value,
        path: reactiveNode.path,
      })
    } else {
      const childPatch = createPatch(reactiveNode.children, value)
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
      createInitialQuery(reactiveTree, data)
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
