import {
  GraphQLObjectType,
} from 'graphql'
import memoize from 'fast-memoize'
import tql from 'typiql'

import RFC4627Patch from './rfc4627/RFC4627Patch'

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
        patches: {
          type: tql`[${RFC4627Patch}!]`,
        },
      }

      if (resumption === true) {
        return {
          ...fields,
          resumptionCursor: {
            type: tql`ID!`,
          },
        }
      }

      return fields
    }
  })
}

export default memoize(GraphQLLiveData)
