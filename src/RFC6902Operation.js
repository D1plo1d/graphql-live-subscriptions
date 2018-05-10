import tql from 'typiql'
import GraphQLJSON from 'graphql-type-json'
import {
  GraphQLObjectType,
} from 'graphql'

const RFC6902Operation = new GraphQLObjectType({
  name: 'RFC6902Operation',
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

export default RFC6902Operation
