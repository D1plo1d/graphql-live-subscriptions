## graphql-live-subscriptions

**Depricated:** Please use https://github.com/n1ru4l/graphql-live-queries instead.

`graphql-live-subscriptions` provides RFC6902-compatible JSON patches over GraphQL. Client-side code can implement live data in a few lines by using any of the available RFC6902 "JSON Patch" libraries listed here: http://jsonpatch.com/

**Why?** Because I wanted to have the benefits of Live Data and it was unclear if the proposed `@live` directive will ever be added to GraphQL.

This library came about as a result of the conversation at https://github.com/facebook/graphql/issues/386

Pull requests are very welcome.

### Installation
`npm install graphql-live-subscriptions`

### Example

```js
import {
  liveSubscriptionTypeDef,
  subscribeToLiveData,
} from 'graphql-live-subscriptions'

const schemaString = `
  type Subscription

  type Query {
    jedis: [Jedi!]!
  }

  type House {
    id: ID!
    address(includePostalCode: Boolean!): String!
    numberOfCats: Int!
    numberOfDogs: Int!
  }

  type Jedi {
    id: ID!
    name: String!
    houses: [House!]!
  }
`
const resolvers = {
  /* graphql-live-subscriptions requires a JSON Scalar resolver */
  JSON: GraphQLJSON,

  Subscription: {
    live: {
      resolve: source => source,
      subscribe: subscribeToLiveData({
        initialState: (source, args, context) => context.store.state,
        eventEmitter: (source, args, context) => context.store.eventEmitter,
        sourceRoots: {
          Jedi: ['houses'],
        },
      }),
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
  Jedi: {
    houses: (jedi, args, context) => {
      const { state } = context.store

      return jedi.houseIDs.map(id => (
        state.houses.find(house => house.id === id)
      ))
    },
  },
}

const schema = makeExecutableSchema({
  typeDefs: [
    schemaString,
    liveSubscriptionTypeDef(),
  ],
  resolvers,
})
```

#### Client Subscription

```graphql
subscription {
  live {
    query {
      jedis {
        firstName
        lastName

        houses {
          address
        }
      }
    }
    patch { op, path, from, value }
  }
}
```


### API

#### liveSubscriptionTypeDef({ type, queryType, subscriptionName })

typedefs for the live subscription.

arguments:
* `type = 'LiveSubscription'` - the type of the subscription
* `queryType = 'Query'` - the name of the query root that the live subscription will wrap
* `subscriptionName = 'live'` - the name of the live subscription

For use with programmatically constructed types. Returns a `GraphQLDataType` with:
* a `query` field - immediately responds with the initial results to the live subscription like a `query` operation would.
* a `patch` field - RFC6902 patch sets sent to the client to update the initial `query` data.

#### subscribeToLiveData({ initialState, eventEmitter, sourceRoots })

arguments:
* `initialState` **function(source, args, context)** returns the latest value to be passed to the query resolver.
* `eventEmitter` **function(source, args, context)** returns either an EventEmitter or a Promise. Events:
  * `emit('update', { nextState })` - graphql-live-subscriptions will generate a patch for us by comparing the next state to the previous state and send it to the subscriber.
  * `emit('patch', { patch })` - graphql-live-subscriptions will send the patch provided directly to the subscriber.
* `sourceRoots` **Object {[typeName: string]: [fieldName: string]}** - a map of all fields which are not entirely based on their parent's source's state. By default the diffing algorithm only checks for changes to a field if it's parent's source has changed. If it is possible for a field to change it's value or the value of a field nested inside it without the source value changing then it needs to be listed here otherwise it will not generate patches when it changes.

returns an AsyncIterator that implements the sending of query's and patches.

### License

graphql-live-subscriptions is [MIT-licensed](https://github.com/graphql/graphql-js/blob/master/LICENSE).
