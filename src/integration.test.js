import {
  parse,
  subscribe,
  GraphQLSchema,
  GraphQLObjectType,
} from 'graphql'
import tql from 'typiql'

import {
  GraphQLLiveData,
  subscribeToLiveData,
} from './'

const getSubscriptionProvider = async (source, args, context, resolveInfo) => {
  return context.store
}

const getSource = async (originalSource, args, context, resolveInfo) => {
  return context.store.getState()
}

const HouseGraphQLType = new GraphQLObjectType({
  name: 'House',
  fields: () => ({
    id: {
      type: tql`ID!`
    },
    address: {
      type: tql`String!`
    },
    numberOfCats: {
      type: tql`Int!`
    },
    numberOfDogs: {
      type: tql`Int!`
    },
  }),
})

const type = () => tql`[${HouseGraphQLType}!]`

const schema = new GraphQLSchema({
  query: HouseGraphQLType,
  subscription: new GraphQLObjectType({
    name: 'SubscriptionRoot',
    fields: () => ({
      houses: {
        type: GraphQLLiveData({
          name: 'HouseLiveData',
          type,
        }),
        resolve(source) {
          return source
        },

        subscribe: subscribeToLiveData({
          getSubscriptionProvider,
          getSource,
          type,
        }),
      }
    })
  }),
})

const createTestSubscription = async () => {
  let onChangeInner
  const onChange = () => onChangeInner()
  const state = [
    {
      id: 'real_street',
      address: '123 real st',
      numberOfCats: 5,
      numberOfDogs: 7,
    },
    {
      id: 'legit_road',
      address: '200 legit rd',
      numberOfCats: 0,
      numberOfDogs: 1,
    },
  ]
  const store = {
    subscribe: (cb) => onChangeInner = cb,
    getState: () => state,
  }

  const document = parse(`
    subscription {
      houses {
        query {
          id
          address
          numberOfCats
        }
        patches { op, path, from, value }
      }
    }
  `)

  let subscription = subscribe({
    schema,
    document,
    contextValue: { store },
  })


  if (subscription.then != null) subscription = await subscription

  return {
    subscription,
    onChange,
    state,
  }
}

const expectSubscriptionResponse = async (subscription) => {
  const result = await subscription.next()

  expect(result.done).toEqual(false)
  expect(result.value.data).toMatchSnapshot()
}

describe('GraphQLLiveData Integration', () => {
  it('publishes the initialQuery immediately', async () => {
    const { subscription, onChange, state } = await createTestSubscription()
    expect(subscription.errors).toEqual(undefined)

    await expectSubscriptionResponse(subscription)
  })

  it('publishes diffs when the subscriber calls the fn passed to subscribe()', async () => {
    const { subscription, onChange, state } = await createTestSubscription()
    expect(subscription.errors).toEqual(undefined)
    // inital query
    await subscription.next()
    // null change should not create a response
    onChange()
    // first diff
    state[0].numberOfDogs = 0
    state[0].numberOfCats = 200
    onChange()
    await expectSubscriptionResponse(subscription)
    // second diff
    state[0].address = state[0].address + ' apt. 1'
    state[1].address = state[1].address + ' apt. 2'
    onChange()
    await expectSubscriptionResponse(subscription)
  })
})
