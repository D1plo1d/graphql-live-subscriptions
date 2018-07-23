const removeAllSourceRoots = (reactiveNode, sourceRootConfig) => {
  if (reactiveNode.isSourceRoot) {
    // eslint-disable-next-line no-param-reassign
    delete sourceRootConfig.nodes[reactiveNode.sourceRootNodeIndex]
  }
  reactiveNode.children.forEach((childNode) => {
    removeAllSourceRoots(childNode, sourceRootConfig)
  })
}

export default removeAllSourceRoots
