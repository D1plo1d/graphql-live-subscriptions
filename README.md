## graphql-live-subscription

`graphql-live-subscription` provides RFC4627-compatible patches over GraphQL. Client-side code can implement live data in a few lines by using any of the available RFC4627 "JSON Patch" libraries listed here: http://jsonpatch.com/

**Why?** Because I wanted to have the benefits of Live Data and it was unclear if the proposed `@live` directive will ever be added to GraphQL.

This library came about as a result of the conversation at https://github.com/facebook/graphql/issues/386

### Installation
`npm install graphql-live-subscription`

### API

#### GraphQLLiveData({ name, type })

returns a `GraphQLDataType` with:
* a `query` field - immediately responds with the initial results to the live subscription like a `query` operation would.
* a `patches` field - RFC4627 patch sets sent to the client to update the initial `query` data.

#### subscribeToLiveData({ getSubscriptionProvider, getSource, type })

arguments:
* `getSubscriptionProvider` MUST be an object with a `subscribe(callback)` function.
* `getSource` MUST be a function that returns the latest value to be passed to the query resolver.
* `type` MUST be the same type passed to `GraphQLLiveData`

returns an AsyncIterator that implements the sending of query's and patches.

### Useage

```js
import {
  GraphQLLiveData,
  subscribeToLiveData,
} from 'graphql-live-subscription'

const schema = new GraphQLSchema({
  query: MyQueryGraphQLType,

  subscription: new GraphQLObjectType({
    name: 'SubscriptionRoot',

    fields: () => ({
      jedis: {
        type: GraphQLLiveData({
          name: 'JediLiveData',
          type: JediGraphQLType,
        }),

        /*
         * DO NOT omit this line. The subscription will not work without a
         * resolve function even though it is only an identity function.
         */
        resolve: source => source

        subscribe: subscribeToLiveData({
          getSubscriptionProvider: () => store,
          getSource: () => store.getJedis(),
          type: JediGraphQLType,
        }),
      },
    }),
  }),
})
```
