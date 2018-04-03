import tql from 'typiql'
import GraphQLJSON from 'graphql-type-json'
import {
  GraphQLObjectType,
} from 'graphql'

const RFC4627Patch = new GraphQLObjectType({
  name: 'RFC4627Patch',
  fields: () => ({
    op: {
      type: tql`String!`,
    },
    path: {
      type: tql`String!`,
    },
    from: {
      type: tql`String`,
    },
    value: {
      type: tql`${GraphQLJSON}`,
    },
  }),
})

export default RFC4627Patch
