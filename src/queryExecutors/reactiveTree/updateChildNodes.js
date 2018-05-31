import {
  isLeafType,
  isObjectType,
  // isAbstractType,
  isListType,
  isNonNullType,
} from 'graphql'
import {
  getFieldDef,
  addPath,
} from 'graphql/execution/execute'

import collectSubFields from '../util/collectSubFields'

import { createNode } from './ReactiveNode'
import removeAllSourceRoots from './removeAllSourceRoots'
import iterableValue from './iterableValue'


const updateChildNodes = (reactiveNode) => {
  const {
    exeContext,
    type,
    fieldNodes,
    children,
    graphqlPath,
    sourceRootConfig,
  } = reactiveNode

  const { schema } = exeContext

  if (isObjectType(type)) {
    const fields = collectSubFields({
      exeContext,
      returnType: type,
      fieldNodes,
    })

    if (Object.keys(fields).length === children.length) return

    /*
     * TODO: recurse down the query to find all fields that have explicitly
     * defined reactive entry points and create a checkForNewValue for each of
     * them.
     *
     * The checks will then be run on each state change and if a new new value
     * is present then the field and it's child fields are compared to their
     * previous values to generate a patch.
     */
    Object.entries(fields).forEach(([childResponseName, childFieldNodes]) => {
      const childFieldDef = getFieldDef(
        schema,
        type,
        childFieldNodes[0].name.value,
      )
      const childPath = addPath(graphqlPath, childResponseName)

      const childReactiveNode = createNode({
        exeContext,
        parentType: type,
        type: childFieldDef.type,
        fieldNodes: childFieldNodes,
        graphqlPath: childPath,
        sourceRootConfig,
      })

      reactiveNode.children.push(childReactiveNode)
    })
  } else if (isListType(type)) {
    /*
     * Add or remove nodes and source roots if the list has changed length
     */
    const value = iterableValue(reactiveNode)

    const previousLength = children.length
    const nextLength = value.length || value.size

    // console.log('NEW CHILDREN', previousLength, nextLength)
    // console.log(reactiveNode)
    // console.log(reactiveNode.children)
    // console.log('-----')

    const listHasGrown = nextLength > previousLength
    const listHasShrunk = nextLength < previousLength

    if (listHasGrown) {
      let index = 0
      // eslint-disable-next-line no-restricted-syntax
      for (const entry of value) {
        if (index >= previousLength) {
          const childNode = createNode({
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
    } else if (listHasShrunk) {
      const removedNodes = reactiveNode.children.splice(nextLength)
      // console.log('SHRUNK', reactiveNode.patchPath, removedNodes)

      removedNodes.forEach((node) => {
        removeAllSourceRoots(node, sourceRootConfig)
      })

      // eslint-disable-next-line no-param-reassign
      reactiveNode.children = reactiveNode.children.splice(0, nextLength)
      // eslint-disable-next-line no-param-reassign
      reactiveNode.removedNodes = removedNodes
    }
  } else if (
    !isLeafType(type)
  ) {
    throw new Error(`unsupported GraphQL type: ${type}`)
  }
}

export default updateChildNodes
