import EventEmitter from 'events'
// eslint-disable-next-line import/no-extraneous-dependencies
import { List, Record } from 'immutable'

/*
 * A simple immutableJS data store for our example.
 */

const State = Record({
  houses: List(),
  jedis: List(),
})

export const House = Record({
  id: null,
  address: null,
  postalCode: null,
  numberOfCats: 0,
  numberOfDogs: null,
})

export const Jedi = Record({
  id: null,
  name: null,
  primaryAddress: null,
  houseIDs: List(),
})

export const initialState = State({
  // GraphQL List generated from Immutable List
  houses: List([
    House({
      id: 'real_street',
      address: '123 real st',
      postalCode: '90210',
      numberOfCats: 5,
      numberOfDogs: 7,
    }),
    House({
      id: 'legit_road',
      address: '200 legit rd',
      postalCode: '90211',
      numberOfCats: 0,
      numberOfDogs: 1,
    }),
  ]),
  // GraphQL List generated from Array
  jedis: [
    Jedi({
      id: 'jedi_1',
      name: 'Luke Skywalker',
      houseIDs: List(['legit_road']),
    }),
    Jedi({
      id: 'jedi_2',
      name: 'Yoda',
      houseIDs: List(),
    }),
    Jedi({
      id: 'jedi_3',
      name: 'Mace Windu',
      houseIDs: List(['legit_road', 'real_street']),
    }),
  ],
})

const store = () => {
  const storeInstance = {
    state: initialState,
    eventEmitter: new EventEmitter(),
    setState: (nextState) => {
      storeInstance.state = nextState
    },
  }
  return storeInstance
}

export default store
