const iterableValue = (reactiveNode) => {
  const { value } = reactiveNode

  if (value == null) return []

  const isIterable = value.length || value.size
  return isIterable ? value : [value]
}

export default iterableValue
