## graphql-live-subscriptions

`graphql-live-subscriptions` provides RFC6902-compatible JSON patches over GraphQL. Client-side code can implement live data in a few lines by using any of the available RFC6902 "JSON Patch" libraries listed here: http://jsonpatch.com/

**Why?** Because I wanted to have the benefits of Live Data and it was unclear if the proposed `@live` directive will ever be added to GraphQL.

This library came about as a result of the conversation at https://github.com/facebook/graphql/issues/386

Pull requests are very welcome.

### Installation
`npm install graphql-live-subscriptions`

### API

#### GraphQLLiveData({ name, type })

returns a `GraphQLDataType` with:
* a `query` field - immediately responds with the initial results to the live subscription like a `query` operation would.
* a `patch` field - RFC6902 patch sets sent to the client to update the initial `query` data.

#### subscribeToLiveData({ getSubscriptionProvider, getSource, type })

arguments:
* `fieldName` MUST be the same name as this field
* `type` MUST be the same type passed to `GraphQLLiveData`
* `trackState` (optional, default: true) if true the subscription does not track the state and generate patches. This can be used to optimize servers that do not use update events. Disables 'update' events.
* `initialState` MUST be a function that returns the latest value to be passed to the query resolver.
* `eventEmitter` MUST be a function that returns either an EventEmitter or a Promise. Events:
  * `emit('update', { nextState })` - graphql-live-subscriptions will generate a patch for us by comparing the next state to the previous state and send it to the subscriber.
  * `emit('patch', { patch })` - graphql-live-subscriptions will send the patch provided to the subscriber.

returns an AsyncIterator that implements the sending of query's and patches.

### Useage

```js
import {
  GraphQLLiveData,
  subscribeToLiveData,
} from 'graphql-live-subscriptions'

const JediLiveDataGraphQLType = () => {
  return GraphQLLiveData({
    name: 'JediLiveData',
    type: JediGraphQLType,
  })
}

const schema = new GraphQLSchema({
  query: MyQueryGraphQLType,

  subscription: new GraphQLObjectType({
    name: 'SubscriptionRoot',

    fields: () => ({
      jedis: {
        type: JediLiveDataGraphQLType(),

        /*
         * DO NOT omit this line. The subscription will not work without a
         * resolve function even though it is only an identity function.
         */
        resolve: source => source

        subscribe: subscribeToLiveData({
          fieldName: 'jedis',
          type: JediLiveDataGraphQLType(),
          initialState: (source, args, context, resolveInfo) => {
            return store.getJedis()
          },
          eventEmitter: (source, args, context, resolveInfo) => {
            const emitter = new EventEmitter()
            store.subscribe(() => {
              emitter.emit('update', store.getJedis())
            })
          },
        }),
      },
    }),
  }),
})
```

#### Client Subscription

```graphql
subscription {
  jedis {
    query {
      id
      firstName
      lastName
    }
    patch { op, path, from, value }
  }
}
```
