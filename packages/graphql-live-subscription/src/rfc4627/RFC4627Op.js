import {
  GraphQLObjectType,
} from 'graphql'
import tql from 'typiql'
import GraphQLJSON from 'graphql-type-json'

const allFields = op => ({
  op: {
    type: tql`String!`,
    resolve: () => op,
  },
  from: {
    type: tql`String!`,
  },
  path: {
    type: tql`String!`,
  },
  value: {
    type: tql`${GraphQLJSON}!`,
  },
})

/* returns an object with only the properties listed in the keys array */
const filterObjectKeys = (obj, keys) => (
  keys.reduce((res, key) => {
    res[key] = obj[key]
    return res
  }, {})
)

const RFC4627Op = ({op, fieldNames}) => new GraphQLObjectType({
  name: `RFC4627${op[0].toUpperCase()}${op.slice(1)}`,
  fields: () => filterObjectKeys(allFields(op), fieldNames)
})

export default RFC4627Op
