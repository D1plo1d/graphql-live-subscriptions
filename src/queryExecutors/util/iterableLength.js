const iterableLength = (iterable) => {
  if (typeof iterable.length === 'number') return iterable.length

  let length = 0
  // eslint-disable-next-line
  for (const _val of iterable) {
    length += 1
  }
  return length
}

export default iterableLength
