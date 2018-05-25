// eslint-disable-next-line import/no-extraneous-dependencies
import { makeExecutableSchema } from 'graphql-tools'
import GraphQLJSON from 'graphql-type-json'

/*
 * if your copy + pasting this example replace this next import with:
 *
 * import { subscribeToLiveData } from 'graphql-live-subscriptions'
 */
import { subscribeToLiveData } from '../index'

import schemaString from './schemaString'

const resolvers = {
  /* graphql-live-subscriptions requires a JSON Scalar resolver */
  JSON: GraphQLJSON,

  Subscription: {
    live: {
      resolve: source => source,
      subscribe: () => {
        const asyncIterator = subscribeToLiveData({
          initialState: (source, args, context) => context.store.getState(),
          eventEmitter: (source, args, context) => context.store.eventEmitter,
        })
        return asyncIterator
      },
    },
  },
  House: {
    address: (house, args) => {
      if (args.includePostalCode) {
        return `${house.address} ${house.postalCode}`
      }
      return house.address
    },
  },
}

const schema = makeExecutableSchema({
  typeDefs: schemaString,
  resolvers,
})

export default schema
