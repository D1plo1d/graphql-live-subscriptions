import { responsePathAsArray } from 'graphql'

export const createPatchPath = graphqlPath => (
  `/${responsePathAsArray(graphqlPath).slice(2).join('/')}`
)

export const updatePatchPaths = (reactiveNode, opts) => {
  const {
    oldPrefix,
    newPrefix,
  } = opts
  // update the patch path for this node
  // eslint-disable-next-line no-param-reassign
  reactiveNode.patchPath = reactiveNode.patchPath.replace(oldPrefix, newPrefix)

  // recursively update this node's children's paths
  reactiveNode.children.forEach((childNode) => {
    updatePatchPaths(childNode, opts)
  })
}

export const updatePathKey = ({ reactiveNode, key }) => {
  // eslint-disable-next-line no-param-reassign
  reactiveNode.graphqlPath.key = key

  updatePatchPaths(reactiveNode, {
    oldPrefix: reactiveNode.patchPath,
    newPrefix: createPatchPath(reactiveNode.graphqlPath),
  })
}
