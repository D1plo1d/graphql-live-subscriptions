import {
  parse,
  subscribe,
} from 'graphql'
import { List } from 'immutable'

import schema from './example'
import createStore, { House, initialState } from './example/store'
import integrationTestQuery from './integrationTestQuery'

// const externallyGeneratedPatch = [
//   {
//     op: 'replace',
//     path: '/1/address',
//     value: '42 Patch Event St.',
//   }
// ]

const createTestSubscription = async ({ state }) => {
  const document = parse(integrationTestQuery)
  const store = createStore()

  if (state != null) store.state = state

  let subscription = subscribe({
    schema,
    document,
    contextValue: {
      store,
    },
  })


  if (subscription.then != null) subscription = await subscription

  if (subscription.errors != null) {
    expect(JSON.stringify(subscription.errors)).toEqual(null)
  }

  return {
    ...store,
    subscription,
  }
}

const expectSubscriptionResponse = async (subscription) => {
  const result = await subscription.next()

  expect(result.done).toEqual(false)
  expect(result.value.data).toMatchSnapshot()
}

describe('GraphQLLiveData Integration', () => {
  it('publishes the initialQuery immediately', async () => {
    const { subscription } = await createTestSubscription({})

    await expectSubscriptionResponse(subscription)
  })

  describe('with an empty list', () => {
    it('publishes the initialQuery immediately', async () => {
      const { subscription } = await createTestSubscription({
        state: initialState.set('houses', List()),
      })

      await expectSubscriptionResponse(subscription)
    })

    it('publishes patches on \'update\'', async () => {
      const {
        subscription,
        eventEmitter,
        state,
      } = await createTestSubscription({
        state: initialState.set('houses', []),
      })

      let nextState = state
      // inital query
      await subscription.next()

      console.log('FIRST PATCH')
      // first patch
      nextState = nextState
        .updateIn(['jedis'], (jedis) => {
          // eslint-disable-next-line
          jedis[0] = {
            ...jedis[0],
            id: 'a_different_id',
          }
          return [...jedis]
        })
      eventEmitter.emit('update', { nextState })
      await expectSubscriptionResponse(subscription)
    })
  })

  describe('with an empty array', () => {
    it('publishes the initialQuery immediately', async () => {
      const { subscription } = await createTestSubscription({
        state: initialState.set('houses', []),
      })

      await expectSubscriptionResponse(subscription)
    })
  })

  it('publishes patches on \'update\'', async () => {
    const {
      subscription,
      eventEmitter,
      state,
    } = await createTestSubscription({})
    let nextState = state
    // inital query
    await subscription.next()
    // null change should not create a response
    eventEmitter.emit('update', { nextState })

    console.log('FIRST PATCH')
    // first patch
    nextState = nextState
      .mergeIn(['houses', 0], {
        numberOfDogs: 0,
        numberOfCats: 200,
      })
    eventEmitter.emit('update', { nextState })
    await expectSubscriptionResponse(subscription)

    // second patch
    nextState = nextState
      .updateIn(['houses', 0, 'address'], address => `${address} apt. 1`)
      .updateIn(['houses', 1, 'address'], address => `${address} apt. 2`)
    eventEmitter.emit('update', { nextState })
    await expectSubscriptionResponse(subscription)
  })

  it('publishes patches on \'update\' with new list entries', async () => {
    const {
      subscription,
      eventEmitter,
      state,
    } = await createTestSubscription({})
    let nextState = state
    // inital query
    await subscription.next()

    // first patch
    const addedHouse = House({
      id: 'add_that_id',
      address: 'somwhere',
      postalCode: '10210',
      numberOfCats: 10,
      numberOfDogs: 5,
    })
    nextState = nextState
      .updateIn(['houses'], houses => houses.push(addedHouse))
    eventEmitter.emit('update', { nextState })
    await expectSubscriptionResponse(subscription)
  })

  it('publishes patches on \'update\' with removed list entries', async () => {
    const {
      subscription,
      eventEmitter,
      state,
    } = await createTestSubscription({})
    let nextState = state
    // inital query
    await subscription.next()

    // first patch
    nextState = nextState
      .updateIn(['jedis'], jedis => jedis.slice(0, -1))
    eventEmitter.emit('update', { nextState })
    await expectSubscriptionResponse(subscription)
  })

  // it('publishes a patch on \'patch\'', async () => {
  //   const {
  //     subscription,
  //     emitUpdate,
  //     emitPatch,
  //     state,
  //   } = await createTestSubscription({})
  //   // inital query
  //   await subscription.next()
  //   // first patch
  //   emitPatch()
  //   await expectSubscriptionResponse(subscription)
  //   // second patch
  //   state[0].address = state[0].address + ' apt. 1'
  //   state[1].address = externallyGeneratedPatch[0].value
  //   emitUpdate()
  //   await expectSubscriptionResponse(subscription)
  // })
})
