const iterableValue = (reactiveNode) => {
  const { value } = reactiveNode

  if (value == null) return []

  const isIterable = value.length != null || value[Symbol.iterator] != null
  return isIterable ? value : [value]
}

export default iterableValue
