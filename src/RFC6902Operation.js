import GraphQLJSON from 'graphql-type-json'
import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'

const RFC6902Operation = new GraphQLObjectType({
  name: 'RFC6902Operation',
  fields: () => ({
    op: {
      type: GraphQLNonNull(GraphQLString),
    },
    path: {
      type: GraphQLNonNull(GraphQLString),
    },
    from: {
      type: GraphQLString,
    },
    value: {
      type: GraphQLJSON,
    },
  }),
})

export default RFC6902Operation
