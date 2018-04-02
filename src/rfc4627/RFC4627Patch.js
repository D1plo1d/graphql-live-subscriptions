import {
  GraphQLUnionType,
} from 'graphql'

import RFC4627Op from './RFC4627Op'

const opTypes = {
  add: RFC4627Op({
    op: 'add',
    fieldNames: ['op', 'path', 'value']
  }),
  remove: RFC4627Op({
    op: 'remove',
    fieldNames: ['op', 'path'],
  }),
  replace: RFC4627Op({
    op: 'replace',
    fieldNames: ['op', 'path', 'value'],
  }),
  move: RFC4627Op({
    op: 'move',
    fieldNames: ['op', 'from', 'path'],
  }),
  copy: RFC4627Op({
    op: 'copy',
    fieldNames: ['op', 'from', 'path'],
  }),
  test: RFC4627Op({
    op: 'test',
    fieldNames: ['op', 'path', 'value'],
  }),
}

const Patch = new GraphQLUnionType({
  name: 'RFC4627Patch',
  types: Object.values(opTypes),
  resolveType: (patch) => opTypes[patch.op],
})

export default Patch
