import {
  isLeafType,
  isObjectType,
  // isAbstractType,
  isListType,
  // isNonNullType,
} from 'graphql'
import {
  getFieldDef,
  addPath,
} from 'graphql/execution/execute'

import collectSubFields from '../util/collectSubFields'

import { createNode } from './ReactiveNode'
import updateListChildNodes from './updateListChildNodes'


const updateChildNodes = (reactiveNode) => {
  const {
    exeContext,
    type,
    fieldNodes,
    children,
    patchPath,
    graphqlPath,
    sourceRootConfig,
    parentType,
  } = reactiveNode

  const { schema } = exeContext

  if (isObjectType(type)) {
    const fields = collectSubFields({
      exeContext,
      returnType: type,
      fieldNodes,
    })

    if (isListType(parentType) && fields.id == null) {
      const err = (
        `the ID must be queried for each object in an array in a live subscription (at ${patchPath})`
      )
      throw new Error(err)
    }

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
    updateListChildNodes(reactiveNode)
  } else if (
    !isLeafType(type)
  ) {
    throw new Error(`Unsupported GraphQL type: ${type}`)
  }
}

export default updateChildNodes
