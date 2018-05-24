import { collectFields } from 'graphql/execution/execute'

/*
 * modified from
 * https://github.com/graphql/graphql-js/blob/master/src/execution/execute.js
 */
const collectSubfields = ({
  exeContext,
  returnType,
  fieldNodes,
}) => {
  let subFieldNodes = Object.create(null)
  const visitedFragmentNames = Object.create(null)
  for (let i = 0; i < fieldNodes.length; i += 1) {
    const { selectionSet } = fieldNodes[i]
    if (selectionSet) {
      subFieldNodes = collectFields(
        exeContext,
        returnType,
        selectionSet,
        subFieldNodes,
        visitedFragmentNames,
      )
    }
  }
  return subFieldNodes
}

export default collectSubfields
