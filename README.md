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

## Choosing a QueryExecutor

Two QueryExecutors are provided with graphql-live-subscriptions.

### FullQueryExecutor

**Pros**

* Compatible with all GraphQL Schemas
* Simple to use

**Cons**

* Slower then ReactiveQueryExecutor

The FullQueryExecutor re-executes the entire query on every `update` and diffs
the results to generate patches.

FullQueryExecutor is slower then the ReactiveQueryExecutor but since it uses
graphql's `execute` function internally it should be compatible with all
schemas.

### ReactiveQueryExecutor

**Pros**

* Faster then the FullQueryExecutor

**Cons**

* Unstable - uses internal GraphQL JS APIs that may break between GraphQL JS releases.
* Cannot handle Errors (*yet* If you can fix this a Pull Requests would be very
  welcome)
* Not compatible with resolve functions that return a Promise (*yet* If you can fix this a Pull Requests would be very
  welcome)
* Requires Source Root configuration for some schemas (see below)

The ReactiveQueryExecutor uses tree diffing on the results of your
GraphQL resolvers to generate patches. The tree diffing algorithim optimizes the
ReactiveQueryExecutor by not executing comparisions on branches of the query
tree where the result of a parent field's resolve function hasn't changed.

ReactiveQueryExecutor is similar to React Pure Components in that it checks for
a change in the data and if there is none then it does not diff any of the child
fields by default.

#### Source Roots

Each Source Root is a root node for the tree diffing algorithm. By default the
query field resolver is used as a Source Root so any changes to it's value or
values in objects nested under it will create patches.

The value of Source Roots comes when you have a scenario where a parent's
field's resolve value does not include it's child field's resolve values.

**Example**

For example if the query field contains field `a` and field `a` contains field
`b` of type `B` so we subscribe to:

```graphql
subscribe {
  liveData {
    query {
      a: b
    }
  }
}
```

Let's consider what happens when `b`'s value changes.

This would work with the default Source Root if our query resolver
returns an immutableJS object `Map({a: Map({b: 'B_VALUE' }) })` because any
change to `b` will result in a new top level immutable Map.

However if our query resolver returns an immutableJS object Map
`Map({a: 'A_VALUE'})` and then `b`'s resolver returns `Map{b: 'B_VALUE'}` then
the default Source Roots will not detect changes to `b` because the object
returned by the query field has not changed. In this scenario we would need to
use `ReactiveQueryExecutor({ sourceRoots: ['B'] })` to receive patches for `b`.
