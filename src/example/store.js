import EventEmitter from 'events'

/*
 * A simplified data store for our example.
 */

export const initialState = () => ({
  houses: [
    {
      id: 'real_street',
      address: '123 real st',
      postalCode: '90210',
      numberOfCats: 5,
      numberOfDogs: 7,
    },
    {
      id: 'legit_road',
      address: '200 legit rd',
      postalCode: '90211',
      numberOfCats: 0,
      numberOfDogs: 1,
    },
  ],
  jedis: [
    {
      id: 'jedi_1',
      name: 'Luke Skywalker',
      houseIDs: ['legit_road'],
    },
    {
      id: 'jedi_2',
      name: 'Yoda',
      houseIDs: [],
    },
    {
      id: 'jedi_3',
      name: 'Mace Windu',
      houseIDs: ['legit_road', 'real_street'],
    },
  ],
})

const store = () => ({
  state: initialState(),
  eventEmitter: new EventEmitter(),
  setState: (nextState) => {
    store.state = nextState
  },
})

export default store
