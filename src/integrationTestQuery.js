const integrationTestQuery = `
  subscription {
    live {
      ...CatQueryFragment

      query {
        houses {
          ... on House {
            id
          }

          address(includePostalCode: false)
        }

      }

      patch { op, path, from, value }
    }
  }

  fragment CatQueryFragment on LiveSubscription {
    query {
      houses {
        numberOfCats
      }
    }
  }
`

// jedis {
//   id
//   name
//   houses {
//     address(includePostalCode: true)
//   }
// }

export default integrationTestQuery
