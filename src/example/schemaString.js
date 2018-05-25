import { liveSubscriptionTypeDef } from '../index'

const liveData = liveSubscriptionTypeDef({
  queryType: 'LiveQueryRoot',
})

const schemaString = `
  type LiveQueryRoot {
    houses: [House!]!
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

export default [
  schemaString,
  liveData,
]
