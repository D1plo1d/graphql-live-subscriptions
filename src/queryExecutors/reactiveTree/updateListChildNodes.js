import { isObjectType } from 'graphql'
import { addPath } from 'graphql/execution/execute'
import listDiff from 'list-diff2'

import { createNode } from './ReactiveNode'
import removeAllSourceRoots from './removeAllSourceRoots'
import iterableValue from './iterableValue'

export const REMOVE = 0
export const ADD = 1

/*
 * for lists of Objects: use the ID of the child nodes to sort/filter them into
 * moved/removed/added subsets.
 * for lists of scalars: use the value of the child nodes to sort+filter them
 * into moved/removed/added subsets.
 */
const updateListChildNodes = (reactiveNode) => {
  const {
    exeContext,
    fieldNodes,
    children,
    graphqlPath,
    sourceRootConfig,
  } = reactiveNode

  const isArrayOfObjects = isObjectType(reactiveNode.type.ofType)

  const value = Array.from(iterableValue(reactiveNode))
  const previousValue = children.map(child => child.value)

  const { moves } = listDiff(
    previousValue,
    value,
    isArrayOfObjects ? 'id' : undefined,
  )

  /*
   * Add or remove nodes and source roots if the entries in the list have moved
   */
  // eslint-disable-next-line no-param-reassign
  reactiveNode.movePatches = moves.forEach((move) => {
    switch (move.type) {
      case ADD: {
        const childNode = createNode({
          exeContext,
          parentType: reactiveNode.type,
          type: reactiveNode.type.ofType,
          fieldNodes,
          graphqlPath: addPath(graphqlPath, move.index),
          sourceRootConfig,
        })
        // add the child at it's index
        reactiveNode.children.splice(move.index, 0, childNode)
        // return a move that references the new child node for later use in
        // patch generation
        return {
          op: 'add',
          childNode,
          childSource: move.item,
        }
      }
      case REMOVE: {
        const childNode = reactiveNode.children[move.index]
        removeAllSourceRoots(childNode, sourceRootConfig)
        // remove the child at it's index
        reactiveNode.children.splice(move.index, 1)

        return {
          op: 'remove',
          childNode,
        }
      }
      default: {
        throw new Error(`invalid move: ${JSON.stringify(move)}`)
      }
    }
  })
}

export default updateListChildNodes
