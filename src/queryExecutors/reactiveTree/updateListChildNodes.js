import { isObjectType } from 'graphql'
import { addPath } from 'graphql/execution/execute'
import listDiff from '@d1plo1d/list-diff2'

import { createNode } from './ReactiveNode'
import removeAllSourceRoots from './removeAllSourceRoots'
import iterableValue from './iterableValue'
import { updatePathKey } from './reactiveNodePaths'

export const REMOVE = 0
export const ADD = 1

const concreteType = type => (
  type.ofType ? concreteType(type.ofType) : type
)

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

  const isArrayOfObjects = isObjectType(concreteType(reactiveNode.type))

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
  reactiveNode.moves = moves.map((move) => {
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
          index: move.index,
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
          index: move.index,
          childNode,
        }
      }
      default: {
        throw new Error(`invalid move: ${JSON.stringify(move)}`)
      }
    }
  })

  if (moves.length > 0) {
    // update each child's patch + graphql path as it may have shifted in the
    // moves
    reactiveNode.children.forEach((childNode, index) => {
      updatePathKey({
        reactiveNode: childNode,
        key: index,
      })
    })
  }
}

export default updateListChildNodes
