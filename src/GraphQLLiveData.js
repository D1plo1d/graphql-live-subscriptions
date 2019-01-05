import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLID,
} from 'graphql'
import memoize from 'fast-memoize'

import RFC6902Operation from './RFC6902Operation'

const GraphQLLiveData = (options = {}) => {
  const { name, resumption } = options

  if (name == null) {
    throw new Error('name cannot be null')
  }

  const getQueryType = () => {
    let { type } = options

    if (typeof type === 'function') {
      type = type()
    }
    if (type == null) {
      throw new Error('Canot create GraphQLLiveData for type null')
    }

    return type
  }

  return new GraphQLObjectType({
    name,
    fields: () => {
      const fields = {
        query: {
          type: getQueryType(),
        },
        patch: {
          type: new GraphQLList(new GraphQLNonNull(RFC6902Operation)),
        },
      }

      if (resumption === true) {
        return {
          ...fields,
          resumptionCursor: {
            type: new GraphQLNonNull(GraphQLID),
          },
        }
      }

      return fields
    },
  })
}

export default memoize(GraphQLLiveData)
