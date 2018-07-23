import {
  isListType,
  isLeafType,
} from 'graphql'

import executionContextFromInfo from './util/executionContextFromInfo'

import ReactiveTree from './reactiveTree/ReactiveTree'
import * as ReactiveNode from './reactiveTree/ReactiveNode'
import iterableValue from './reactiveTree/iterableValue'

const createInitialQuery = (reactiveNode, source) => {
  ReactiveNode.setInitialValue(reactiveNode, source)
  // console.log('INITAIL QUERY', reactiveNode.name, reactiveNode.value, 'source', source)

  const {
    children,
  } = reactiveNode

  if (isLeafType(reactiveNode.type) || reactiveNode.value == null) {
    return reactiveNode.value
  }

  if (isListType(reactiveNode.type)) {
    const json = []
    let index = 0
    // eslint-disable-next-line no-restricted-syntax
    for (const entry of iterableValue(reactiveNode)) {
      const childJSON = createInitialQuery(children[index], entry)
      json.push(childJSON)
      index += 1
    }
    return json
  }

  const json = {}
  // console.log('children???', reactiveNode.children)
  reactiveNode.children.forEach((childNode) => {
    const childSource = reactiveNode.value
    // console.log('uhhh', childNode.name, childSource)
    const childJSON = createInitialQuery(childNode, childSource)
    // TODO: this is the field name. Should be the alias name
    json[childNode.name] = childJSON
  })
  // console.log('initial json for', reactiveNode.type, json)
  return json
}

const createPatch = (reactiveNode, source, patch = []) => {
  // console.log('PATCH')
  // console.log(reactiveNode)
  const previousValue = reactiveNode.value

  const value = ReactiveNode.getNextValueOrUnchanged(reactiveNode, source)

  const { removedNodes } = reactiveNode
  if (removedNodes.length > 0) {
    removedNodes.forEach((removedNode) => {
      patch.push({
        op: 'remove',
        path: removedNode.patchPath,
      })
    })

    reactiveNode.removedNodes = []
  }

  if (!reactiveNode.initializedValue) {
    patch.push({
      op: 'add',
      path: reactiveNode.patchPath,
      value: createInitialQuery(reactiveNode, source),
    })
    return patch
  }

  // console.log('patch', reactiveNode.patchPath, 'previous', previousValue, 'next', value)
  if (value === ReactiveNode.UNCHANGED) {
    return patch
  }
  if (isLeafType(reactiveNode.type)) {
    patch.push({
      op: 'replace',
      value,
      path: reactiveNode.patchPath,
    })
    return patch
  }

  if (isListType(reactiveNode.type)) {
    let index = 0
    // Compatible with any Iterable
    // eslint-disable-next-line no-restricted-syntax
    for (const childSource of value) {
      const childNode = reactiveNode.children[index]
      createPatch(childNode, childSource, patch)

      index += 1
    }
  } else {
    // console.log('kids these days', reactiveNode.children)
    reactiveNode.children.forEach((childNode) => {
      const childSource = value
      createPatch(childNode, childSource, patch)
    })
  }

  // console.log('patch', patch)
  return patch
}

const ReactiveQueryExecutor = ({
  context,
  resolveInfo,
  fieldName,
  sourceRoots,
}) => {
  const exeContext = executionContextFromInfo(resolveInfo, context)

  const reactiveTree = ReactiveTree({
    exeContext,
    operation: resolveInfo.operation,
    subscriptionName: fieldName,
    sourceRoots,
  })

  return {
    initialQuery: async data => (
      createInitialQuery(reactiveTree.queryRoot, { query: data })
    ),
    // TODO: create patches for all source roots once source roots are
    // implemented
    createPatch: async (data) => {
      const patch = []
      createPatch(reactiveTree.queryRoot, { query: data }, patch)
      reactiveTree.sourceRootConfig.nodes.forEach((rootNode) => {
        createPatch(rootNode, rootNode.sourceValue, patch)
      })
      return patch
    },
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
