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

        jedis {
          id
          name
          primaryAddress {
            id
            address(includePostalCode: true)
          }
          houses {
            id
            address(includePostalCode: true)
          }
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

export default integrationTestQuery
