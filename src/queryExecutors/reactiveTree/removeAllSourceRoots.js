const removeAllSourceRoots = (reactiveNode, sourceRootConfig) => {
  if (reactiveNode.isSourceRoot) {
    // eslint-disable-next-line no-param-reassign
    delete sourceRootConfig[reactiveNode.parentType.name][reactiveNode.name]
  }
  reactiveNode.children.forEach((childNode) => {
    removeAllSourceRoots(childNode, sourceRootConfig)
  })
}

export default removeAllSourceRoots
